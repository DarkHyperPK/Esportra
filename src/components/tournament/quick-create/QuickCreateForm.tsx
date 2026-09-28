/**
 * QuickCreateForm — Template-as-review pattern
 *
 * The template pre-fills everything. The organizer reviews and adjusts.
 * Yellow attention dots mark fields worth checking before creation.
 * No deferred work — tournament is ready to publish on submit.
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  Globe,
  MapPin,
  Loader2,
  Info,
  AlertTriangle,
  Swords,
} from 'lucide-react';
import slugify from 'slugify';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CommandButton } from '@/components/management/CommandSurface';
import { useToast } from '@/hooks/use-toast';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { apiClient } from '@/lib/apiClient';
import { fetchCurrentOrganizationId } from '@/lib/currentOrganization';
import { cn } from '@/lib/utils';
import {
  getGameByName,
  getGameModes,
  getGameModeGroups,
  getDefaultTeamSize,
} from '@/utils/gameFeatures';
import type { TournamentTemplateDto } from '@/types/tournamentTemplate';
import {
  SPRING_EXPAND,
  SPRING_VENUE,
  CARD_STRIKE_TAP,
} from './quickCreateMotion';
import { isPowerOf2, nextPowerOf2 } from './utils';

function getNextSaturday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return d.toISOString().split('T')[0];
}

interface StageTemplate {
  key: string;
  label: string;
  desc: string;
  stageCount: number;
  stages: { name: string; format: string }[];
  stageLabels: string[];
}

const STAGE_TEMPLATES: StageTemplate[] = [
  {
    key: 'standard_cup',
    label: 'Standard Cup',
    desc: 'Classic Single Elimination bracket. Simple and fast.',
    stageCount: 1,
    stages: [{ name: 'Main Bracket', format: 'single_elimination' }],
    stageLabels: ['Main Bracket'],
  },
  {
    key: 'pro_cup',
    label: 'Pro Cup',
    desc: 'Double Elimination bracket with escalating series formats.',
    stageCount: 1,
    stages: [{ name: 'Main Bracket', format: 'double_elimination' }],
    stageLabels: ['Main Bracket'],
  },
  {
    key: 'world_cup',
    label: 'World Cup Style',
    desc: 'Group Stage (Round Robin) followed by Single Elimination Playoffs.',
    stageCount: 2,
    stages: [
      { name: 'Group Stage', format: 'round_robin' },
      { name: 'Playoffs', format: 'single_elimination' },
    ],
    stageLabels: ['Group Stage', 'Playoffs'],
  },
  {
    key: 'major_format',
    label: 'Major Format',
    desc: 'Swiss System followed by Single Elimination Playoffs. Used in major esports events.',
    stageCount: 2,
    stages: [
      { name: 'Swiss Stage', format: 'swiss' },
      { name: 'Playoffs', format: 'single_elimination' },
    ],
    stageLabels: ['Swiss Stage', 'Playoffs'],
  },
];

const BR_FORMAT_META: Record<string, { label: string; desc: string }> = {
  single_lobby: { label: 'Single Lobby', desc: 'All teams in one lobby' },
  static_groups: { label: 'Static Groups', desc: 'Fixed group assignments' },
  group_rotation: { label: 'Group Rotation', desc: 'Wave pairings across groups' },
  multi_lobby_cut: { label: 'Multi-Lobby Cut', desc: 'Parallel lobbies, top teams advance' },
};

const AttentionDot = () => (
  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 ml-1.5 flex-shrink-0" title="Worth reviewing" />
);

const SectionLabel: React.FC<{ children: React.ReactNode; attention?: boolean }> = ({ children, attention }) => (
  <div className="flex items-center mb-3">
    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-gray-500">{children}</span>
    {attention && <AttentionDot />}
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  template: TournamentTemplateDto;
  onBack: () => void;
}

export const QuickCreateForm: React.FC<Props> = ({ template, onBack }) => {
  useGameCatalog();
  const navigate = useNavigate();
  const { toast } = useToast();

  const game = getGameByName(template.gameName);
  const gameModes = game ? getGameModes(template.gameName) : [];
  const gameModeGroups = game ? getGameModeGroups(template.gameName) : [];
  const isMultiMode = gameModes.length > 1;
  const isBR = template.gameType === 'battle_royale';

  // nothing needed here — stage templates are self-contained

  // ── Form state — pre-filled from template ────────────────────────────────
  const [selectedMode, setSelectedMode] = useState(template.defaultModeKey);
  const [modeChipOpen, setModeChipOpen] = useState(false);
  const [name, setName] = useState(`${template.gameName} Tournament`);
  const [startDate, setStartDate] = useState(getNextSaturday());
  const [startTime, setStartTime] = useState('18:00');
  const [chipSelected, setChipSelected] = useState<number | null>(
    template.recommendedTeamCounts.length > 0 ? template.recommendedTeamCounts[0] : null,
  );
  const [freeTeams, setFreeTeams] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [venueAddress, setVenueAddress] = useState('');
  // Prize pool + entry fee removed from quick create — handled in dashboard
  const [selectedStageTemplate, setSelectedStageTemplate] = useState<string>(
    isBR ? 'battle_royale' : 'standard_cup',
  );
  const [brSubFormat, setBrSubFormat] = useState('static_groups');
  // Currency removed from quick create — handled in dashboard
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Derived values ────────────────────────────────────────────────────────
  const effectiveNumTeams = chipSelected !== null
    ? chipSelected
    : freeTeams !== '' ? parseInt(freeTeams, 10) || 0 : 0;

  const teamSize = getDefaultTeamSize(template.gameName, selectedMode);

  const stageTemplate = STAGE_TEMPLATES.find((t) => t.key === selectedStageTemplate);
  const hasElimStage = stageTemplate?.stages.some(
    (s) => s.format === 'single_elimination' || s.format === 'double_elimination',
  ) ?? false;

  const showByeNote =
    hasElimStage &&
    effectiveNumTeams >= 2 &&
    !isPowerOf2(effectiveNumTeams);

  const currentModeLabel =
    gameModes.find(
      (m) => (m.key ?? m.value) === selectedMode || m.value === selectedMode,
    )?.name ?? selectedMode;

  const today = new Date().toISOString().split('T')[0];

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleChipSelect = (count: number) => {
    setChipSelected(chipSelected === count ? null : count);
    if (chipSelected !== count) setFreeTeams('');
    if (errors.teams) setErrors((e) => { const n = { ...e }; delete n.teams; return n; });
  };

  const handleFreeTeamsChange = (val: string) => {
    setFreeTeams(val);
    setChipSelected(null);
    if (errors.teams) setErrors((e) => { const n = { ...e }; delete n.teams; return n; });
  };

  const handleModeSelect = (modeKey: string) => {
    setSelectedMode(modeKey);
    setModeChipOpen(false);
  };

  const handleSubmit = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Tournament name is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!startTime) newErrors.startTime = 'Start time is required';
    if (!effectiveNumTeams || effectiveNumTeams < 2) {
      newErrors.teams = 'Select or enter a team count (minimum 2)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + 4 * 60 * 60 * 1000);
      const computedDeadline = new Date(startDateTime.getTime() - 24 * 60 * 60 * 1000);
      const minDeadline = new Date(Date.now() + 15 * 60 * 1000);
      const registrationDeadline = computedDeadline < minDeadline ? minDeadline : computedDeadline;
      const slug = slugify(name.trim(), { lower: true, strict: true });
      const organizationId = await fetchCurrentOrganizationId();

      const stages = isBR
        ? [{
            name: 'Main Stage',
            format: 'battle_royale',
            bestOf: template.defaultBestOf,
            capacity: effectiveNumTeams,
            stageOrder: 1,
            config: { br: { format: brSubFormat } },
          }]
        : (stageTemplate?.stages ?? []).map((s, i) => ({
            name: s.name,
            format: s.format,
            bestOf: template.defaultBestOf,
            capacity: effectiveNumTeams,
            stageOrder: i + 1,
          }));

      const payload = {
        name: name.trim(),
        game: template.gameName,
        gameMode: selectedMode,
        slug,
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
      };

      const result = await apiClient.post<{ slug: string }>('/api/tournaments', payload);
      navigate(`/organizer/tournament/${result.slug}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create tournament';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    name, startDate, startTime, effectiveNumTeams, stageTemplate, brSubFormat, selectedMode,
    isOnline, venueAddress, publishImmediately,
    template, teamSize, isBR, navigate, toast,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full pb-16">

      {/* Back button */}
      <div className="px-6 md:px-12 pt-6 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="group flex items-center gap-2 text-gray-500 hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-none"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-[0.1em]">Back</span>
        </button>
      </div>

      {/* ── Game context bar ─────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 pt-4 pb-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          {template.logoUrl && (
            <img
              src={template.logoUrl}
              alt={template.gameName}
              className="w-10 h-10 object-contain"
            />
          )}
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-gray-500 mb-0.5">
              Quick Create
            </div>
            <div className="text-lg font-bold uppercase tracking-[-0.025em] leading-tight text-white">
              {template.gameName}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-gray-500">
            Bo{template.defaultBestOf}
          </span>
          {isMultiMode && (
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-gray-500">
              {currentModeLabel} · {teamSize}v{teamSize}
            </span>
          )}
          {template.isPublisherEndorsed ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] px-2.5 py-1 bg-rose-500 text-white border border-rose-400">
              Official
            </span>
          ) : (
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] px-2.5 py-1 bg-white/5 text-gray-400 border border-white/10">
              Curated
            </span>
          )}
        </div>
      </div>

      {/* ── Pre-filled template notice ───────────────────────────────────────── */}
      <div className="px-6 md:px-12 py-4 bg-amber-500/5 border-b border-amber-500/10 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-amber-200/80 leading-relaxed">
          Template defaults applied — review and adjust anything before creating.
          Fields with <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mx-0.5 align-middle" /> may need your attention.
        </p>
      </div>

      {/* ── Form body ────────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 space-y-10 mt-8">

        {/* ── Mode selector — multi-mode games only ─────────────────────────── */}
        {isMultiMode && (
          <div>
            <SectionLabel>Game Mode</SectionLabel>
            <button
              type="button"
              onClick={() => setModeChipOpen((o) => !o)}
              className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.1em] bg-white/[0.02] border border-white/10 px-4 py-3 text-white hover:bg-white/[0.04] hover:border-white/15 transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-none"
            >
              <span className="text-gray-400">Mode:</span>
              <span>{currentModeLabel}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500">{teamSize}v{teamSize}</span>
              <motion.span
                animate={{ rotate: modeChipOpen ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </motion.span>
            </button>

            <AnimatePresence>
              {modeChipOpen && (
                <motion.div
                  initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                  animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                  exit={{ opacity: 0, gridTemplateRows: '0fr' }}
                  transition={SPRING_EXPAND}
                  style={{ display: 'grid', overflow: 'hidden' }}
                >
                  <div style={{ minHeight: 0, overflow: 'hidden' }} className="pt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {gameModeGroups.map((group) => {
                        const groupModeKey = group.modes[0]?.key ?? group.modes[0]?.value ?? '';
                        const isGroupSelected = group.modes.some(
                          (m) => (m.key ?? m.value) === selectedMode || m.value === selectedMode,
                        );
                        return (
                          <button
                            key={group.key}
                            type="button"
                            onClick={() => handleModeSelect(groupModeKey)}
                            className={cn(
                              'rounded-none border px-4 py-3 text-left text-sm font-bold uppercase tracking-wide transition-colors duration-120',
                              isGroupSelected
                                ? 'border-rose-500 bg-rose-500/10 text-white'
                                : 'border-white/10 bg-black/40 text-gray-400 hover:border-white/20 hover:text-white',
                            )}
                          >
                            {group.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Tournament Name ──────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center mb-3">
            <Label htmlFor="qc-name" className="font-mono text-[10px] uppercase tracking-[0.1em] text-gray-500">
              Tournament Name *
            </Label>
            {name === `${template.gameName} Tournament` && <AttentionDot />}
          </div>
          <Input
            id="qc-name"
            placeholder="e.g., Summer Showdown 2026"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => { const n = { ...prev }; delete n.name; return n; });
            }}
            className={cn(
              'text-base tracking-tight border-white/10 bg-white/[0.02] focus:border-white/30 focus:bg-white/[0.04] transition-colors duration-120 rounded-none',
              errors.name && 'border-red-500 focus:border-red-400',
            )}
          />
          {errors.name && (
            <p className="text-[11px] tracking-wide text-red-400 mt-2">{errors.name}</p>
          )}
        </div>

        {/* ── Start Date + Time ────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Schedule</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="qc-start-date" className="font-mono text-[10px] uppercase tracking-[0.1em] text-gray-600">
                Start Date *
              </Label>
              <Input
                id="qc-start-date"
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (errors.startDate) setErrors((prev) => { const n = { ...prev }; delete n.startDate; return n; });
                }}
                className={cn(
                  '[color-scheme:dark] text-base tracking-tight border-white/10 bg-white/[0.02] focus:border-white/30 focus:bg-white/[0.04] transition-colors duration-120 rounded-none',
                  errors.startDate && 'border-red-500 focus:border-red-400',
                )}
              />
              {errors.startDate && <p className="text-[11px] tracking-wide text-red-400">{errors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc-start-time" className="font-mono text-[10px] uppercase tracking-[0.1em] text-gray-600">
                Start Time *
              </Label>
              <Input
                id="qc-start-time"
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  if (errors.startTime) setErrors((prev) => { const n = { ...prev }; delete n.startTime; return n; });
                }}
                className={cn(
                  '[color-scheme:dark] text-base tracking-tight border-white/10 bg-white/[0.02] focus:border-white/30 focus:bg-white/[0.04] transition-colors duration-120 rounded-none',
                  errors.startTime && 'border-red-500 focus:border-red-400',
                )}
              />
              {errors.startTime && <p className="text-[11px] tracking-wide text-red-400">{errors.startTime}</p>}
            </div>
          </div>
          <p className="text-[11px] tracking-wide text-gray-500/60 mt-3">
            Registration closes 24h before start. Defaults to next Saturday 6 PM.
          </p>
        </div>

        {/* ── Number of Teams ──────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Number of {isBR ? 'Squads' : 'Teams'} *</SectionLabel>

          {template.recommendedTeamCounts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {template.recommendedTeamCounts.map((count) => {
                const isSelected = chipSelected === count;
                return (
                  <motion.button
                    key={count}
                    type="button"
                    onClick={() => handleChipSelect(count)}
                    whileTap={CARD_STRIKE_TAP}
                    className={cn(
                      'px-6 py-3 border font-mono text-sm font-bold uppercase tracking-wide rounded-none transition-colors duration-120',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                      isSelected
                        ? 'border-white bg-white text-black'
                        : 'border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:bg-white/[0.04] hover:text-white',
                    )}
                  >
                    {count}
                  </motion.button>
                );
              })}
            </div>
          )}

          <Input
            type="number"
            min="2"
            placeholder="Or type a number…"
            value={freeTeams}
            onChange={(e) => handleFreeTeamsChange(e.target.value)}
            className={cn(
              'text-base tracking-tight border-white/10 bg-white/[0.02] focus:border-white/30 focus:bg-white/[0.04] transition-colors duration-120 rounded-none',
              chipSelected !== null && 'opacity-40 pointer-events-none',
              errors.teams && 'border-red-500 focus:border-red-400',
            )}
          />
          {errors.teams && <p className="text-[11px] tracking-wide text-red-400 mt-2">{errors.teams}</p>}
        </div>

        {/* ── Stage Template — bracket games ─────────────────────────────── */}
        {!isBR && (
          <div>
            <SectionLabel>Stage Format</SectionLabel>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {STAGE_TEMPLATES.map((tmpl) => {
                const isSelected = selectedStageTemplate === tmpl.key;
                return (
                  <motion.button
                    key={tmpl.key}
                    type="button"
                    onClick={() => setSelectedStageTemplate(tmpl.key)}
                    whileTap={CARD_STRIKE_TAP}
                    className={cn(
                      'text-left p-5 border rounded-none',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                      'transition-colors duration-120',
                      isSelected
                        ? 'border-rose-500 bg-rose-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
                    )}
                  >
                    <div className="font-bold text-sm uppercase tracking-wide text-white mb-1.5">
                      {tmpl.label}
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                      {tmpl.desc}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 bg-white/10 text-gray-300">
                        {tmpl.stageCount} {tmpl.stageCount === 1 ? 'stage' : 'stages'}
                      </span>
                      {tmpl.stageLabels.map((label, i) => (
                        <React.Fragment key={label}>
                          {i > 0 && <span className="text-gray-600 text-[10px]">›</span>}
                          <span className="font-mono text-[10px] text-gray-500">{label}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {showByeNote && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mt-4 flex items-start gap-2 text-[11px] tracking-wide text-amber-400 font-mono"
                >
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    {effectiveNumTeams} teams → nearest bracket size is {nextPowerOf2(effectiveNumTeams)} (byes will be added)
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── BR Format ──────────────────────────────────────────────────── */}
        {isBR && (
          <div>
            <SectionLabel>
              <span className="flex items-center gap-2">
                <Swords className="w-3.5 h-3.5" />
                Battle Royale Format
              </span>
            </SectionLabel>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(BR_FORMAT_META).map(([key, meta]) => {
                const isSelected = brSubFormat === key;
                return (
                  <motion.button
                    key={key}
                    type="button"
                    onClick={() => setBrSubFormat(key)}
                    whileTap={CARD_STRIKE_TAP}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 p-5',
                      'border rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                      'transition-colors duration-120',
                      isSelected
                        ? 'border-rose-500 bg-rose-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
                    )}
                  >
                    <span className="font-bold text-xs uppercase tracking-wide text-white">{meta.label}</span>
                    <span className="text-[10px] text-gray-500 text-center">{meta.desc}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Online / LAN ───────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Tournament Type</SectionLabel>
          <RadioGroup
            value={isOnline ? 'online' : 'lan'}
            onValueChange={(v) => setIsOnline(v === 'online')}
            className="grid grid-cols-2 gap-4"
          >
            <label
              className={cn(
                'flex items-center gap-4 p-4 border cursor-pointer transition-colors duration-120 rounded-none',
                isOnline
                  ? 'border-rose-500 bg-rose-500/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]',
              )}
            >
              <RadioGroupItem value="online" className="sr-only" />
              <Globe className={cn('w-5 h-5', isOnline ? 'text-rose-400' : 'text-gray-500')} />
              <div>
                <div className="text-sm font-medium text-white">Online</div>
                <div className="text-[11px] tracking-wide text-gray-500/60">Players compete remotely</div>
              </div>
            </label>
            <label
              className={cn(
                'flex items-center gap-4 p-4 border cursor-pointer transition-colors duration-120 rounded-none',
                !isOnline
                  ? 'border-rose-500 bg-rose-500/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]',
              )}
            >
              <RadioGroupItem value="lan" className="sr-only" />
              <MapPin className={cn('w-5 h-5', !isOnline ? 'text-rose-400' : 'text-gray-500')} />
              <div>
                <div className="text-sm font-medium text-white">LAN</div>
                <div className="text-[11px] tracking-wide text-gray-500/60">In-person at a venue</div>
              </div>
            </label>
          </RadioGroup>

          <AnimatePresence>
            {!isOnline && (
              <motion.div
                initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                exit={{ opacity: 0, gridTemplateRows: '0fr' }}
                transition={SPRING_VENUE}
                style={{ display: 'grid', overflow: 'hidden' }}
              >
                <div style={{ minHeight: 0, overflow: 'hidden' }} className="pt-4 space-y-2">
                  <Label htmlFor="qc-venue" className="font-mono text-[10px] uppercase tracking-[0.1em] text-gray-500">
                    Venue Address (optional)
                  </Label>
                  <Input
                    id="qc-venue"
                    placeholder="Enter venue address"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    className="text-base tracking-tight border-white/10 bg-white/[0.02] focus:border-white/30 focus:bg-white/[0.04] transition-colors duration-120 rounded-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Financials (prize pool, entry fee, currency) are configured in the
            tournament dashboard after creation — not in quick create. */}

        {/* ── Publish + Create ────────────────────────────────────────────── */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-3">
            <Checkbox
              id="qc-publish"
              checked={publishImmediately}
              onCheckedChange={(v) => setPublishImmediately(Boolean(v))}
              className="border-white/20 bg-transparent data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500 rounded-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0"
            />
            <Label
              htmlFor="qc-publish"
              className="text-sm text-gray-400 select-none cursor-pointer hover:text-white transition-colors duration-150"
            >
              Publish immediately
            </Label>
            {!publishImmediately && (
              <span className="text-[10px] font-mono text-gray-600 ml-2">→ Creates as draft</span>
            )}
          </div>

          <CommandButton
            variant="primary"
            size="lg"
            slide
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto sm:min-w-[220px]"
          >
            <AnimatePresence mode="wait">
              {isSubmitting ? (
                <motion.span
                  key="spinner"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="flex items-center justify-center"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                </motion.span>
              ) : (
                <motion.span
                  key="text"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  Create Tournament
                </motion.span>
              )}
            </AnimatePresence>
          </CommandButton>
        </div>
      </div>
    </div>
  );
};
