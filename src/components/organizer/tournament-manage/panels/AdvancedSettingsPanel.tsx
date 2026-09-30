import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CommandHeader, CommandSection } from '@/components/management/CommandSurface';
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
  const [selectedMapIds, setSelectedMapIds] = useState<string[]>([]);
  const savedMapIdsRef = useRef<string[]>([]);

  const queryClient = useQueryClient();
  const gameFeatures = getEffectiveGameFeatures(tournament.game || '', tournament.game_mode);
  const settings = useMemo(() => tournament.settings ?? {}, [tournament.settings]);

  const resolveAssistedReporting = (t: DashboardTournament): boolean => {
    // Fallback for old key name
    return t.settings?.assistedReportingEnabled ?? t.settings?.assistedMatchReporting ?? false;
  };

  const [form, setForm] = useState<FormState>({
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

  // Available maps for the game
  const { data: availableMapsData, isLoading: mapsLoading } = useQuery({
    queryKey: ['available-maps', tournament.game],
    queryFn: () => apiClient.get<TournamentMapOption[]>(`/api/games/maps?game=${encodeURIComponent(tournament.game || '')}`),
    enabled: gameFeatures.mapVeto && !!tournament.game,
  });

  useEffect(() => {
    if (Array.isArray(mapPoolData) && mapPoolData.length > 0) {
      const ids = mapPoolData.map((m) => m.id);
      setSelectedMapIds(ids);
      savedMapIdsRef.current = ids;
    } else if (
      Array.isArray(mapPoolData) && mapPoolData.length === 0 &&
      form.mapVetoEnabled && availableMapsData?.length
    ) {
      const poolSize = gameFeatures.mapPoolSize || 7;
      setSelectedMapIds(availableMapsData.slice(0, poolSize).map((m) => m.id));
    }
  }, [mapPoolData, availableMapsData, form.mapVetoEnabled, gameFeatures.mapPoolSize]);

  const mapsAreDirty = [...selectedMapIds].sort().join() !== [...savedMapIdsRef.current].sort().join();

  const isDirty =
    form.mapVetoEnabled !== (settings.mapVetoEnabled ?? gameFeatures.mapVeto ?? false) ||
    form.assistedReportingEnabled !== resolveAssistedReporting(tournament) ||
    form.scoreReportedBy !== ((settings.scoreReportedBy as ScoreReportedBy) || 'players') ||
    form.serverRegion !== (tournament.server_region || '') ||
    form.requiredAccountLinks !== (settings.requiredAccountLinks ?? 1) ||
    form.discordLinkCount !== (settings.discordLinkCount ?? 0) ||
    mapsAreDirty;

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  const isFieldLocked = (field: string) => !editableFields.has('*') && !editableFields.has(field);

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [
        apiClient.put(`/api/tournaments/${tournament.id}`, {
          assistedReportingEnabled: form.assistedReportingEnabled,
          requiredAccountLinks: form.requiredAccountLinks,
          discordLinkCount: form.discordLinkCount,
          serverRegion: form.serverRegion.trim() || undefined,
          settings: {
            mapVetoEnabled: form.mapVetoEnabled,
            scoreReportedBy: form.scoreReportedBy,
          },
        }),
      ];
      if (mapsAreDirty) {
        promises.push(
          apiClient.put(`/api/tournaments/${tournament.id}/map-pool`, { mapIds: selectedMapIds })
        );
      }
      await Promise.all(promises);
      if (mapsAreDirty) {
        savedMapIdsRef.current = [...selectedMapIds];
        queryClient.invalidateQueries({ queryKey: ['map-pool', tournament.id] });
      }
      toast({ title: 'Saved', description: 'Match settings updated.' });
      onSave();
    } catch (err: any) {
      toast({ title: "Couldn't save", description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, form, mapsAreDirty, selectedMapIds, tournament.id, toast, onSave]);

  const lockNote = 'Locked once the tournament is live.';

  return (
    <>
      <CommandHeader
        eyebrow="Configure"
        title="Match settings"
        description="Who reports results, how maps are chosen, and which accounts players need."
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
                onCheckedChange={(checked) => {
                  setForm((s) => ({ ...s, mapVetoEnabled: checked }));
                  if (checked && selectedMapIds.length === 0 && availableMapsData?.length) {
                    const poolSize = gameFeatures.mapPoolSize || 7;
                    setSelectedMapIds(availableMapsData.slice(0, poolSize).map((m) => m.id));
                  }
                }}>
                <TournamentMapPoolSelector
                  game={tournament.game || ''}
                  requiredCount={gameFeatures.mapPoolSize || 7}
                  availableMaps={availableMapsData ?? []}
                  selectedIds={selectedMapIds}
                  onChange={setSelectedMapIds}
                  mapVetoEnabled={form.mapVetoEnabled}
                  loading={mapsLoading}
                />
              </ToggleRow>
            </FormSection>
          )}

          <FormSection title="Account requirements">
            <Field label="Discord accounts required per team" htmlFor="st-discord" hint="0 means Discord isn't required. 1 is the captain only."
              lockedReason={isFieldLocked('discord_link_count') ? lockNote : undefined}>
              <Input id="st-discord" type="number" min={0} max={4} value={form.discordLinkCount}
                onChange={(e) => setForm((s) => ({ ...s, discordLinkCount: parseInt(e.target.value, 10) || 0 }))}
                disabled={isFieldLocked('discord_link_count')} className={cn(CONTROL_CLASS, 'w-28')} />
            </Field>
          </FormSection>
        </div>
      </CommandSection>

      <PanelSaveBar isDirty={isDirty} saving={saving} onSave={handleSave} onDiscard={resetForm} />
    </>
  );
}
