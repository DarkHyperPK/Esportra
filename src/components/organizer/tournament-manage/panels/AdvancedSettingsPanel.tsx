import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  CommandHeader,
  CommandSection,
  CommandActionBar,
  CommandButton,
  DirtyIndicator,
} from '@/components/management/CommandSurface';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  { value: 'players', label: 'Players', description: 'Match captains submit their own scores' },
  { value: 'admins', label: 'Admins', description: 'Only admins can confirm match results' },
];

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default">
          <Info className="h-3 w-3 text-zinc-600 hover:text-zinc-400 transition-colors" />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[200px] border-white/10 bg-[#0d0d0f] text-[11px] text-zinc-300"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

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

  useEffect(() => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id, tournament.updated_at]);

  // Current map pool for this tournament
  const { data: mapPoolData } = useQuery({
    queryKey: ['map-pool', tournament.id],
    queryFn: () => apiClient.get<{ mapIds: string[] }>(`/api/tournaments/${tournament.id}/map-pool`),
    enabled: gameFeatures.mapVeto,
  });

  useEffect(() => {
    if (mapPoolData?.mapIds) {
      setSelectedMapIds(mapPoolData.mapIds);
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
      toast({ title: 'Settings saved' });
      onSave();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, form, tournament.id, settings, toast, onSave]);

  const handleSaveMapPool = useCallback(async () => {
    if (savingMapPool) return;
    setSavingMapPool(true);
    try {
      await apiClient.put(`/api/tournaments/${tournament.id}/map-pools`, {
        mapIds: selectedMapIds,
      });
      toast({ title: 'Map pool saved' });
    } catch (err: any) {
      toast({ title: 'Map pool save failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSavingMapPool(false);
    }
  }, [savingMapPool, selectedMapIds, tournament.id, toast]);

  return (
    <TooltipProvider delayDuration={300}>
      <CommandHeader eyebrow="CONFIGURATION" title="Settings" />

      {/* Match Rules */}
      <CommandSection>
        <p className="mb-4 border-b border-white/[0.05] pb-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">MATCH RULES</p>
        <div className="space-y-4">
          {/* Score Reported By */}
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-300">Score Reported By</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {SCORE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, scoreReportedBy: opt.value }))}
                  disabled={isFieldLocked('score_reported_by')}
                  className={`flex items-center gap-2 border px-3 py-2.5 text-left transition-all disabled:pointer-events-none disabled:opacity-50 ${
                    form.scoreReportedBy === opt.value
                      ? 'border-rose-500/40 bg-rose-500/[0.06] text-white'
                      : 'border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:border-white/15 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <span className="text-sm font-semibold capitalize">{opt.label}</span>
                  <InfoTip text={opt.description} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </CommandSection>

      {/* Game Features */}
      {(gameFeatures.mapVeto || gameFeatures.assistedReporting) && (
        <CommandSection>
          <p className="mb-4 border-b border-white/[0.05] pb-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">GAME FEATURES</p>
          <div className="border border-white/[0.06] bg-white/[0.01]">
            {gameFeatures.mapVeto && (
              <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-3">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-white">Map Veto</p>
                  <InfoTip text="Teams ban/pick maps before each match." />
                </div>
                <Switch
                  checked={form.mapVetoEnabled}
                  onCheckedChange={(checked) => setForm((s) => ({ ...s, mapVetoEnabled: checked }))}
                  disabled={isFieldLocked('map_pool')}
                />
              </div>
            )}

            {gameFeatures.assistedReporting && (
              <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-white">Assisted Reporting</p>
                  <InfoTip text="Auto-detect results from the game's API." />
                </div>
                <Switch
                  checked={form.assistedReportingEnabled}
                  onCheckedChange={(checked) => setForm((s) => ({ ...s, assistedReportingEnabled: checked }))}
                />
              </div>
            )}
          </div>

          {/* Map Pool — inline when veto enabled */}
          {gameFeatures.mapVeto && form.mapVetoEnabled && (
            <div className="mt-4 space-y-3">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">MAP POOL</p>
              <TournamentMapPoolSelector
                game={tournament.game || ''}
                requiredCount={0}
                availableMaps={availableMapsData ?? []}
                selectedIds={selectedMapIds}
                onChange={setSelectedMapIds}
                mapVetoEnabled={form.mapVetoEnabled}
                loading={mapsLoading}
              />
              <div className="flex justify-end">
                <CommandButton
                  onClick={handleSaveMapPool}
                  disabled={savingMapPool}
                  variant="primary"
                  size="sm"
                >
                  {savingMapPool ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Map Pool'}
                </CommandButton>
              </div>
            </div>
          )}
        </CommandSection>
      )}

      {/* Account Links */}
      <CommandSection>
        <p className="mb-4 border-b border-white/[0.05] pb-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">ACCOUNT LINKS</p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Required Account Links</Label>
              <InfoTip text="Number of linked accounts (Steam, Riot, etc.) required to register." />
            </div>
            <Input
              type="number"
              min={0}
              max={5}
              value={form.requiredAccountLinks}
              onChange={(e) => setForm((s) => ({ ...s, requiredAccountLinks: parseInt(e.target.value, 10) || 0 }))}
              disabled={isFieldLocked('required_account_links')}
              className="max-w-[120px] border-white/10 bg-black/30 text-white disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Discord Link Count</Label>
              <InfoTip text="Number of Discord accounts participants can link." />
            </div>
            <Input
              type="number"
              min={0}
              max={4}
              value={form.discordLinkCount}
              onChange={(e) => setForm((s) => ({ ...s, discordLinkCount: parseInt(e.target.value, 10) || 0 }))}
              disabled={isFieldLocked('discord_link_count')}
              className="max-w-[120px] border-white/10 bg-black/30 text-white disabled:opacity-50"
            />
          </div>
        </div>
      </CommandSection>

      {/* Integrations */}
      <CommandSection>
        <p className="mb-4 border-b border-white/[0.05] pb-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">INTEGRATIONS</p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Discord Webhook</Label>
              <InfoTip text="Receive automated notifications in your Discord server." />
            </div>
            <Input
              value={form.discordWebhookUrl}
              onChange={(e) => setForm((s) => ({ ...s, discordWebhookUrl: e.target.value }))}
              disabled={isFieldLocked('discord_webhook_url')}
              placeholder="https://discord.com/api/webhooks/..."
              className="border-white/10 bg-black/30 text-white placeholder:text-zinc-600 disabled:opacity-50"
            />
          </div>
        </div>
      </CommandSection>

      {/* Infrastructure */}
      <CommandSection>
        <p className="mb-4 border-b border-white/[0.05] pb-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">INFRASTRUCTURE</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Server Region</Label>
            <InfoTip text="The infrastructure region to route matches through." />
          </div>
          <Input
            value={form.serverRegion}
            onChange={(e) => setForm((s) => ({ ...s, serverRegion: e.target.value }))}
            disabled={isFieldLocked('server_region')}
            placeholder="e.g. eu-west, us-east"
            className="max-w-[260px] border-white/10 bg-black/30 text-white placeholder:text-zinc-600 disabled:opacity-50"
          />
        </div>
      </CommandSection>

      <CommandActionBar>
        <div className="flex items-center gap-3">
          <DirtyIndicator isDirty={isDirty} />
          <CommandButton
            onClick={handleSave}
            disabled={!isDirty || saving}
            variant="primary"
            size="sm"
            slide
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </CommandButton>
        </div>
      </CommandActionBar>
    </TooltipProvider>
  );
}
