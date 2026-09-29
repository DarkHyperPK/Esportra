import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CommandButton, CommandHeader, CommandSection } from '@/components/management/CommandSurface';
import { Input } from '@/components/ui/input';
import { ChoiceCard, ChoiceGroup, CONTROL_CLASS, Field, FormSection, FORM_MEASURE_CLASS, ToggleRow } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import { PanelSaveBar } from '../PanelSaveBar';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { getEffectiveGameFeatures } from '@/utils/gameFeatures';
import { useDirtyState } from '@/components/organizer/tournament-manage/TournamentDashboardShell';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';
import TournamentMapPoolSelector, { type TournamentMapOption } from '@/components/tournament/wizard/TournamentMapPoolSelector';

interface AdvancedSettingsPanelProps {
  tournament: DashboardTournament;
  editableFields: Set<string>;
  onSave: () => void;
}

type ScoreReportedBy = 'players' | 'admins';

interface FormState {
  discordWebhookUrl: string;
  mapVetoEnabled: boolean;
  assistedReportingEnabled: boolean;
  scoreReportedBy: ScoreReportedBy;
  serverRegion: string;
  requiredAccountLinks: number;
  discordLinkCount: number;
}

const SCORE_OPTIONS: { value: ScoreReportedBy; label: string; description: string }[] = [
  { value: 'players', label: 'Captains report', description: 'Both captains submit the score. Disagreements become disputes.' },
  { value: 'admins', label: 'Staff report', description: 'Only you and your staff enter results. Slower, but fully controlled.' },
];

export function AdvancedSettingsPanel({ tournament, editableFields, onSave }: AdvancedSettingsPanelProps) {
  const { toast } = useToast();
  const { setDirty } = useDirtyState();
  const [saving, setSaving] = useState(false);
  const [savingMapPool, setSavingMapPool] = useState(false);
  const [selectedMapIds, setSelectedMapIds] = useState<string[]>([]);

  const gameFeatures = getEffectiveGameFeatures(tournament.game || '', tournament.game_mode);
  const settings = useMemo(() => tournament.settings ?? {}, [tournament.settings]);

  const resolveAssistedReporting = (t: DashboardTournament): boolean => {
    // Fallback for old key name
    return t.settings?.assistedReportingEnabled ?? t.settings?.assistedMatchReporting ?? false;
  };

  const [form, setForm] = useState<FormState>({
    discordWebhookUrl: settings.discordWebhookUrl || '',
    mapVetoEnabled: settings.mapVetoEnabled ?? gameFeatures.mapVeto ?? false,
    assistedReportingEnabled: resolveAssistedReporting(tournament),
    scoreReportedBy: (settings.scoreReportedBy as ScoreReportedBy) || 'players',
    serverRegion: tournament.server_region || '',
    requiredAccountLinks: settings.requiredAccountLinks ?? 1,
    discordLinkCount: settings.discordLinkCount ?? 0,
  });

  const resetForm = () => {
    const s = tournament.settings ?? {};
    setForm({
      discordWebhookUrl: s.discordWebhookUrl || '',
      mapVetoEnabled: s.mapVetoEnabled ?? gameFeatures.mapVeto ?? false,
      assistedReportingEnabled: resolveAssistedReporting(tournament),
      scoreReportedBy: (s.scoreReportedBy as ScoreReportedBy) || 'players',
      serverRegion: tournament.server_region || '',
      requiredAccountLinks: s.requiredAccountLinks ?? 1,
      discordLinkCount: s.discordLinkCount ?? 0,
    });
  };

  useEffect(() => {
    resetForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id, tournament.updated_at]);

  // Current map pool for this tournament
  const { data: mapPoolData } = useQuery({
    queryKey: ['map-pool', tournament.id],
    queryFn: () => apiClient.get<{ id: string }[]>(`/api/tournaments/${tournament.id}/map-pool`),
    enabled: gameFeatures.mapVeto,
  });

  useEffect(() => {
    if (Array.isArray(mapPoolData) && mapPoolData.length > 0) {
      setSelectedMapIds(mapPoolData.map((m) => m.id));
    }
  }, [mapPoolData]);

  // Available maps for the game
  const { data: availableMapsData, isLoading: mapsLoading } = useQuery({
    queryKey: ['available-maps', tournament.game],
    queryFn: () => apiClient.get<TournamentMapOption[]>(`/api/games/maps?game=${encodeURIComponent(tournament.game || '')}`),
    enabled: gameFeatures.mapVeto && !!tournament.game,
  });

  const isDirty =
    form.discordWebhookUrl !== (settings.discordWebhookUrl || '') ||
    form.mapVetoEnabled !== (settings.mapVetoEnabled ?? gameFeatures.mapVeto ?? false) ||
    form.assistedReportingEnabled !== resolveAssistedReporting(tournament) ||
    form.scoreReportedBy !== ((settings.scoreReportedBy as ScoreReportedBy) || 'players') ||
    form.serverRegion !== (tournament.server_region || '') ||
    form.requiredAccountLinks !== (settings.requiredAccountLinks ?? 1) ||
    form.discordLinkCount !== (settings.discordLinkCount ?? 0);

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  const isFieldLocked = (field: string) => !editableFields.has('*') && !editableFields.has(field);

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await apiClient.put(`/api/tournaments/${tournament.id}`, {
        assistedReportingEnabled: form.assistedReportingEnabled,
        requiredAccountLinks: form.requiredAccountLinks,
        discordLinkCount: form.discordLinkCount,
        serverRegion: form.serverRegion.trim() || undefined,
        settings: {
          ...settings,
          discordWebhookUrl: form.discordWebhookUrl.trim() || undefined,
          mapVetoEnabled: form.mapVetoEnabled,
          scoreReportedBy: form.scoreReportedBy,
        },
      });
      toast({ title: 'Saved', description: 'Match settings updated.' });
      onSave();
    } catch (err: any) {
      toast({ title: "Couldn't save", description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, form, tournament.id, settings, toast, onSave]);

  const handleSaveMapPool = useCallback(async () => {
    if (savingMapPool) return;
    setSavingMapPool(true);
    try {
      await apiClient.put(`/api/tournaments/${tournament.id}/map-pool`, {
        mapIds: selectedMapIds,
      });
      toast({ title: 'Map pool saved', description: 'Captains will veto from these maps.' });
    } catch (err: any) {
      toast({ title: "Couldn't save the map pool", description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSavingMapPool(false);
    }
  }, [savingMapPool, selectedMapIds, tournament.id, toast]);

  const lockNote = 'Locked once the tournament is live.';

  return (
    <>
      <CommandHeader
        eyebrow="Configure"
        title="Match settings"
        description="Who reports results, how maps are chosen, which accounts players need, and where notifications go."
      />

      <CommandSection>
        <div className={FORM_MEASURE_CLASS}>
          <FormSection title="Results">
            <ChoiceGroup label="Who reports results" columns={2}>
              {SCORE_OPTIONS.map((opt) => (
                <ChoiceCard key={opt.value} selected={form.scoreReportedBy === opt.value} disabled={isFieldLocked('score_reported_by')}
                  onSelect={() => setForm((s) => ({ ...s, scoreReportedBy: opt.value }))} title={opt.label} description={opt.description} />
              ))}
            </ChoiceGroup>
            {gameFeatures.assistedReporting && (
              <ToggleRow id="st-assisted" title="Pull results from Riot"
                description="Captains pick the finished match from their history instead of typing scores."
                checked={form.assistedReportingEnabled} onCheckedChange={(checked) => setForm((s) => ({ ...s, assistedReportingEnabled: checked }))}>
                <Field label="Riot accounts required per team" htmlFor="st-riot" hint="Teams can't register until this many players have linked Riot. 0 to 5."
                  lockedReason={isFieldLocked('required_account_links') ? lockNote : undefined}>
                  <Input id="st-riot" type="number" min={0} max={5} value={form.requiredAccountLinks}
                    onChange={(e) => setForm((s) => ({ ...s, requiredAccountLinks: parseInt(e.target.value, 10) || 0 }))}
                    disabled={isFieldLocked('required_account_links')} className={cn(CONTROL_CLASS, 'w-28')} />
                </Field>
              </ToggleRow>
            )}
          </FormSection>

          {gameFeatures.mapVeto && (
            <FormSection title="Maps">
              <ToggleRow id="st-veto" title="Map veto before each match"
                description="Captains take turns banning and picking from your map pool."
                checked={form.mapVetoEnabled} disabled={isFieldLocked('map_pool')}
                onCheckedChange={(checked) => setForm((s) => ({ ...s, mapVetoEnabled: checked }))}>
                <TournamentMapPoolSelector
                  game={tournament.game || ''}
                  requiredCount={gameFeatures.mapPoolSize || 7}
                  availableMaps={availableMapsData ?? []}
                  selectedIds={selectedMapIds}
                  onChange={setSelectedMapIds}
                  mapVetoEnabled={form.mapVetoEnabled}
                  loading={mapsLoading}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-zinc-500">The map pool saves separately from the settings below.</p>
                  <CommandButton onClick={handleSaveMapPool} disabled={savingMapPool} variant="secondary" size="sm">
                    {savingMapPool ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Saving" /> : 'Save map pool'}
                  </CommandButton>
                </div>
              </ToggleRow>
            </FormSection>
          )}

          <FormSection title="Accounts and notifications">
            <Field label="Discord accounts required per team" htmlFor="st-discord" hint="0 means Discord isn't required. 1 is the captain only."
              lockedReason={isFieldLocked('discord_link_count') ? lockNote : undefined}>
              <Input id="st-discord" type="number" min={0} max={4} value={form.discordLinkCount}
                onChange={(e) => setForm((s) => ({ ...s, discordLinkCount: parseInt(e.target.value, 10) || 0 }))}
                disabled={isFieldLocked('discord_link_count')} className={cn(CONTROL_CLASS, 'w-28')} />
            </Field>
            <Field label="Discord webhook" htmlFor="st-webhook" optional hint="Posts registrations, results and disputes into a channel on your server."
              lockedReason={isFieldLocked('discord_webhook_url') ? lockNote : undefined}>
              <Input id="st-webhook" value={form.discordWebhookUrl} placeholder="https://discord.com/api/webhooks/…"
                onChange={(e) => setForm((s) => ({ ...s, discordWebhookUrl: e.target.value }))}
                disabled={isFieldLocked('discord_webhook_url')} className={CONTROL_CLASS} />
            </Field>
          </FormSection>
        </div>
      </CommandSection>

      <PanelSaveBar isDirty={isDirty} saving={saving} onSave={handleSave} onDiscard={resetForm} />
    </>
  );
}
