/**
 * QuickCreateForm — template-as-review.
 *
 * The template fills in everything; the organizer checks the few details
 * marked with a dot and creates a draft. Layout: form on the left at a
 * readable width, a live summary of the result on the right (desktop), and
 * one sticky action bar so "Create" is always in reach.
 */
import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Loader2, MapPin } from 'lucide-react';
import slugify from 'slugify';
import { Input } from '@/components/ui/input';
import { CommandButton } from '@/components/management/CommandSurface';
import {
  ActionBar,
  ChipGroup,
  ChoiceCard,
  ChoiceGroup,
  CONTROL_CLASS,
  CONTROL_ERROR_CLASS,
  Field,
  FormSection,
  InlineNotice,
  PageIntro,
} from '@/components/ui/kit';
import { useToast } from '@/hooks/use-toast';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { fetchCurrentOrganizationId } from '@/lib/currentOrganization';
import { cn } from '@/lib/utils';
import { getDefaultTeamSize, getGameByName, getGameModeGroups, getGameModes } from '@/utils/gameFeatures';
import type { TournamentTemplateDto } from '@/types/tournamentTemplate';
import { BR_FORMATS, STAGE_TEMPLATES, formatStart, getNextSaturday } from './quickCreateOptions';
import { QuickCreateSummary } from './QuickCreateSummary';
import { isPowerOf2, nextPowerOf2 } from './utils';

interface Props {
  template: TournamentTemplateDto;
  onBack: () => void;
}

type Errors = Partial<Record<'name' | 'startDate' | 'startTime' | 'teams', string>>;

export const QuickCreateForm: React.FC<Props> = ({ template, onBack }) => {
  useGameCatalog();
  const navigate = useNavigate();
  const { toast } = useToast();

  const game = getGameByName(template.gameName);
  const gameModes = game ? getGameModes(template.gameName) : [];
  const gameModeGroups = game ? getGameModeGroups(template.gameName) : [];
  const isBR = template.gameType === 'battle_royale';
  const defaultName = `${template.gameName} Tournament`;

  const [selectedMode, setSelectedMode] = useState(template.defaultModeKey);
  const [name, setName] = useState(defaultName);
  const [defaultDate] = useState(getNextSaturday);
  const [startDate, setStartDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('18:00');
  const [chipSelected, setChipSelected] = useState<number | null>(template.recommendedTeamCounts[0] ?? null);
  const [freeTeams, setFreeTeams] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [venueAddress, setVenueAddress] = useState('');
  const [selectedStageTemplate, setSelectedStageTemplate] = useState(isBR ? 'battle_royale' : 'standard_cup');
  const [brSubFormat, setBrSubFormat] = useState('static_groups');
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveNumTeams = chipSelected ?? (freeTeams !== '' ? parseInt(freeTeams, 10) || 0 : 0);
  const teamSize = getDefaultTeamSize(template.gameName, selectedMode);
  const teamNoun = isBR ? 'squads' : 'teams';
  const stageTemplate = STAGE_TEMPLATES.find((t) => t.key === selectedStageTemplate);
  const hasElimStage = stageTemplate?.stages.some((s) => s.format.endsWith('_elimination')) ?? false;
  const showByeNote = hasElimStage && effectiveNumTeams >= 2 && !isPowerOf2(effectiveNumTeams);
  const bracketSize = nextPowerOf2(effectiveNumTeams);
  const currentModeLabel =
    gameModes.find((m) => (m.key ?? m.value) === selectedMode || m.value === selectedMode)?.name ?? selectedMode;
  const activeGroupKey = gameModeGroups.find((g) => g.modes.some((m) => (m.key ?? m.value) === selectedMode || m.value === selectedMode))?.key ?? null;
  const formatLabel = isBR
    ? BR_FORMATS.find((f) => f.key === brSubFormat)?.label ?? 'Battle royale'
    : stageTemplate?.label ?? 'Single elimination';
  const today = new Date().toISOString().split('T')[0];

  const clearError = (key: keyof Errors) => setErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const handleChipSelect = (count: number) => {
    setChipSelected(chipSelected === count ? null : count);
    setFreeTeams('');
    clearError('teams');
  };

  const handleSubmit = useCallback(async () => {
    const nextErrors: Errors = {};
    if (!name.trim()) nextErrors.name = 'Give your tournament a name.';
    if (!startDate) nextErrors.startDate = 'Pick a start date.';
    if (!startTime) nextErrors.startTime = 'Pick a start time.';
    if (!effectiveNumTeams || effectiveNumTeams < 2) nextErrors.teams = `Choose at least 2 ${teamNoun}.`;
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + 4 * 60 * 60 * 1000);
      const computedDeadline = new Date(startDateTime.getTime() - 24 * 60 * 60 * 1000);
      const minDeadline = new Date(Date.now() + 15 * 60 * 1000);
      const registrationDeadline = computedDeadline < minDeadline ? minDeadline : computedDeadline;
      const organizationId = await fetchCurrentOrganizationId();

      const stages = isBR
        ? [{ name: 'Main Stage', format: 'battle_royale', bestOf: template.defaultBestOf, capacity: effectiveNumTeams, stageOrder: 1, config: { br: { format: brSubFormat } } }]
        : (stageTemplate?.stages ?? []).map((s, i) => ({
          name: s.name,
          format: s.format,
          bestOf: template.defaultBestOf,
          capacity: effectiveNumTeams,
          stageOrder: i + 1,
        }));

      const result = await apiClient.post<{ slug: string }>('/api/tournaments', {
        name: name.trim(),
        game: template.gameName,
        gameMode: selectedMode,
        slug: slugify(name.trim(), { lower: true, strict: true }),
        maxTeams: effectiveNumTeams,
        teamSize,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        registrationDeadline: registrationDeadline.toISOString(),
        status: publishImmediately ? 'published' : 'draft',
        isPublic: publishImmediately,
        organizationId: organizationId ?? undefined,
        entryFee: 0,
        prizePool: 0,
        currency: 'USD',
        payoutMethod: 'manual',
        tournamentType: isBR ? 'battle_royale' : 'bracket',
        templateId: template.id,
        venueAddress: !isOnline && venueAddress.trim() ? venueAddress.trim() : undefined,
        stages,
        mapPoolIds: [],
        settings: {},
      });
      navigate(`/organizer/tournament/${result.slug}`);
    } catch (err: unknown) {
      toast({
        title: "Couldn't create the tournament",
        description: getApiErrorMessage(err, { context: 'generic' }),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    name, startDate, startTime, effectiveNumTeams, teamNoun, stageTemplate, brSubFormat, selectedMode,
    isOnline, venueAddress, publishImmediately, template, teamSize, isBR, navigate, toast,
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-8 sm:px-6 md:pt-12">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Choose a different game
      </button>

      <PageIntro
        eyebrow="Quick start · Step 2 of 2"
        title={`Set up your ${template.gameName} tournament`}
        description={
          <>
            We filled in the usual settings{template.isPublisherEndorsed ? ' from the official rules' : ''}. Check anything marked
            with <span className="mx-0.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" aria-hidden /> and create your draft.
          </>
        }
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 max-w-2xl">
          <FormSection title="The basics">
            <Field
              label="Tournament name"
              htmlFor="qc-name"
              hint="Shown on the listing, the bracket and every match page."
              error={errors.name}
              review={name === defaultName}
            >
              <Input
                id="qc-name"
                placeholder="e.g. Karachi Winter Cup"
                value={name}
                onChange={(e) => { setName(e.target.value); clearError('name'); }}
                className={cn(CONTROL_CLASS, errors.name && CONTROL_ERROR_CLASS)}
              />
            </Field>
            {gameModeGroups.length > 1 && (
              <Field label="Game mode" hint={`${currentModeLabel} · ${teamSize} players per team`}>
                <ChipGroup
                  label="Game mode"
                  value={activeGroupKey}
                  onChange={(key) => {
                    const group = gameModeGroups.find((g) => g.key === key);
                    const mode = group?.modes[0];
                    if (mode) setSelectedMode(mode.key ?? mode.value);
                  }}
                  options={gameModeGroups.map((g) => ({ value: g.key, label: g.label }))}
                />
              </Field>
            )}
          </FormSection>

          <FormSection title="When it starts" description="Registration closes 24 hours before the start time.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Start date" htmlFor="qc-start-date" error={errors.startDate} review={startDate === defaultDate}>
                <Input
                  id="qc-start-date"
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); clearError('startDate'); }}
                  className={cn(CONTROL_CLASS, errors.startDate && CONTROL_ERROR_CLASS)}
                />
              </Field>
              <Field label="Start time" htmlFor="qc-start-time" error={errors.startTime} hint="Your local time.">
                <Input
                  id="qc-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => { setStartTime(e.target.value); clearError('startTime'); }}
                  className={cn(CONTROL_CLASS, errors.startTime && CONTROL_ERROR_CLASS)}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title={`How many ${teamNoun}`}
            description={`The most ${teamNoun} that can sign up. You can raise it later while registration is open.`}
          >
            <Field label={`Number of ${teamNoun}`} htmlFor="qc-teams-other" error={errors.teams}>
              <div className="flex flex-wrap items-center gap-3">
                {template.recommendedTeamCounts.length > 0 && (
                  <ChipGroup
                    label={`Number of ${teamNoun}`}
                    value={chipSelected}
                    onChange={handleChipSelect}
                    options={template.recommendedTeamCounts.map((count) => ({ value: count, label: String(count) }))}
                  />
                )}
                <Input
                  id="qc-teams-other"
                  type="number"
                  min="2"
                  placeholder="Or type a number"
                  value={freeTeams}
                  onChange={(e) => { setFreeTeams(e.target.value); setChipSelected(null); clearError('teams'); }}
                  className={cn(CONTROL_CLASS, 'h-10 w-44', errors.teams && CONTROL_ERROR_CLASS)}
                />
              </div>
            </Field>
            {showByeNote && (
              <InlineNotice tone="neutral">
                {effectiveNumTeams} {teamNoun} don't fill a bracket, so {bracketSize - effectiveNumTeams} get a first-round bye
                (bracket of {bracketSize}).
              </InlineNotice>
            )}
          </FormSection>

          {!isBR ? (
            <FormSection title="Bracket style" description="How teams are knocked out. You can add or change stages later.">
              <ChoiceGroup label="Bracket style" columns={2}>
                {STAGE_TEMPLATES.map((tmpl) => (
                  <ChoiceCard
                    key={tmpl.key}
                    selected={selectedStageTemplate === tmpl.key}
                    onSelect={() => setSelectedStageTemplate(tmpl.key)}
                    title={tmpl.label}
                    description={tmpl.desc}
                    meta={
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                        {tmpl.stages.map((s) => s.name).join(' → ')}
                      </span>
                    }
                  />
                ))}
              </ChoiceGroup>
            </FormSection>
          ) : (
            <FormSection title="Lobby format" description="How squads are split across lobbies. Points decide the standings.">
              <ChoiceGroup label="Lobby format" columns={2}>
                {BR_FORMATS.map((format) => (
                  <ChoiceCard
                    key={format.key}
                    selected={brSubFormat === format.key}
                    onSelect={() => setBrSubFormat(format.key)}
                    title={format.label}
                    description={format.desc}
                  />
                ))}
              </ChoiceGroup>
            </FormSection>
          )}

          <FormSection title="Where it's played">
            <ChoiceGroup label="Where it's played" columns={2}>
              <ChoiceCard
                selected={isOnline}
                onSelect={() => setIsOnline(true)}
                icon={<Globe className="h-5 w-5" aria-hidden />}
                title="Online"
                description="Players join from home."
              />
              <ChoiceCard
                selected={!isOnline}
                onSelect={() => setIsOnline(false)}
                icon={<MapPin className="h-5 w-5" aria-hidden />}
                title="LAN"
                description="Everyone plays at one venue."
              />
            </ChoiceGroup>
            {!isOnline && (
              <Field label="Venue address" htmlFor="qc-venue" optional hint="You can add it later if the venue isn't booked yet.">
                <Input
                  id="qc-venue"
                  placeholder="Street, city"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className={CONTROL_CLASS}
                />
              </Field>
            )}
          </FormSection>

          <FormSection title="After you create it">
            <ChoiceGroup label="After you create it" columns={2}>
              <ChoiceCard
                selected={!publishImmediately}
                onSelect={() => setPublishImmediately(false)}
                title="Save as draft"
                description="Add prizes and branding first. Only you can see it."
              />
              <ChoiceCard
                selected={publishImmediately}
                onSelect={() => setPublishImmediately(true)}
                title="Publish now"
                description="Listed publicly and open for sign-ups straight away."
              />
            </ChoiceGroup>
          </FormSection>

          <ActionBar
            sticky
            className="mt-2"
            status="You can change all of this later."
            end={
              <CommandButton variant="primary" size="md" slide onClick={handleSubmit} disabled={isSubmitting} className="min-w-[200px]">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Creating" /> : publishImmediately ? 'Create and publish' : 'Create draft'}
              </CommandButton>
            }
          />
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-24">
            <QuickCreateSummary
              name={name}
              gameName={template.gameName}
              logoUrl={template.logoUrl}
              modeLabel={currentModeLabel}
              teamSize={teamSize}
              startLabel={formatStart(startDate, startTime)}
              teams={effectiveNumTeams}
              teamNoun={teamNoun}
              formatLabel={formatLabel}
              isOnline={isOnline}
              venue={venueAddress}
              publish={publishImmediately}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
