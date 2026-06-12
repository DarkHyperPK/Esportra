import React, { useState, useEffect, useMemo } from 'react';
import { useBRLobbies, useBRLobbyResults } from '@/hooks/useBRLobbies';
import { useBRRealtime } from '@/hooks/useBRRealtime';
import { useToast } from '@/hooks/use-toast';
import { RoundResultsGrid } from './RoundResultsGrid';
import { BRGameRunList } from './BRGameRunList';
import { RoundEvidencePanel } from './RoundEvidencePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Play,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Key,
  RefreshCw,
  Undo2,
  Clock,
  RotateCcw,
  MapPin,
} from 'lucide-react';
import type { BRGroupTeam } from '@/types/brGroups';
import type { BRRound, BRResultInput } from '@/types/brRounds';
import type { BRMapConfig, BRMapCatalogItem } from '@/types/battleRoyale';
import { resolveMapForRound } from '@/utils/brConfigResolve';
import { BRMapOptionList, BRMapBadge } from '@/components/organizer/br/BRMapOptionList';
import { BR_FEATURE_FLAGS } from '@/config/brFeatureFlags';

interface ScoringPreset {
  placements: number[];
  killPoints: number;
  killCap: number | null;
}

type RoundAction = 'start' | 'complete' | 'reopen' | 'reset';

type RoundActionSettings = {
  lobbyCode: string | null;
  queueTimerMinutes: number | null;
  scheduledAt: string | null;
  map?: string | null;
};

interface RoundManagementPanelProps {
  stageId: string;
  groupId: string;
  groupName: string;
  teams: BRGroupTeam[];
  scoringPreset: ScoringPreset;
  mapConfig: BRMapConfig;
  mapCatalogItems?: BRMapCatalogItem[];
  /** When false, hides manual lobby creation (rotation stages use Schedule commit). */
  allowCreateLobby?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'border-zinc-500/30 text-zinc-400' },
  active: { label: 'Live', color: 'border-amber-500/30 text-amber-400 bg-amber-500/10' },
  completed: { label: 'Completed', color: 'border-emerald-500/30 text-emerald-400' },
};

export const RoundManagementPanel: React.FC<RoundManagementPanelProps> = ({
  stageId,
  groupId,
  groupName,
  teams,
  scoringPreset,
  mapConfig,
  mapCatalogItems = [],
  allowCreateLobby = true,
}) => {
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null);
  const { connected } = useBRRealtime({ stageId, groupId, lobbyId: expandedRoundId });
  const { lobbies: rounds, isLoading, error, refetch, createLobby, updateLobby, resetLobby } = useBRLobbies(
    stageId,
    groupId,
    { realtimeConnected: connected },
  );
  const { toast } = useToast();
  // Reset expansion if the expanded round was deleted
  useEffect(() => {
    if (expandedRoundId && !rounds.some(r => r.id === expandedRoundId)) {
      setExpandedRoundId(null);
    }
  }, [rounds, expandedRoundId]);
  const [confirmAction, setConfirmAction] = useState<{
    roundId: string;
    roundNumber: number;
    action: RoundAction;
    settings?: RoundActionSettings;
  } | null>(null);
  const isMutatingRound = updateLobby.isPending || resetLobby.isPending;

  const handleCreateRound = async () => {
    try {
      const payload: { map?: string | null } = {};
      if (BR_FEATURE_FLAGS.mapsEnabled) {
        const nextRoundNumber = rounds.length + 1;
        payload.map = resolveMapForRound(mapConfig, nextRoundNumber);
      }
      await createLobby.mutateAsync(payload);
    } catch {
      /* toast handled by hook */
    }
  };

  const handleStatusChange = async () => {
    if (!confirmAction) return;
    const { roundId, roundNumber, action } = confirmAction;
    const statusMap = { start: 'active', complete: 'completed', reopen: 'active' } as const;
    try {
      if (action === 'reset') {
        await resetLobby.mutateAsync({ lobbyId: roundId, roundNumber });
      } else if (action === 'start') {
        await updateLobby.mutateAsync({
          lobbyId: roundId,
          status: statusMap[action],
          lobbyCode: confirmAction.settings?.lobbyCode ?? null,
          scheduledAt: confirmAction.settings?.scheduledAt ?? null,
          queueTimerMinutes: confirmAction.settings?.queueTimerMinutes ?? null,
          map: confirmAction.settings?.map ?? null,
        });
      } else {
        await updateLobby.mutateAsync({ lobbyId: roundId, status: statusMap[action] });
      }
    } catch {
      /* toast handled by hook */
    } finally {
      setConfirmAction(null);
    }
  };

  const handleLobbyCodeUpdate = async (
    roundId: string,
    lobbyCode: string,
    scheduledAt: string | null,
    queueTimerMinutes: number | null,
    map?: string | null,
  ) => {
    await updateLobby.mutateAsync({ lobbyId: roundId, lobbyCode: lobbyCode || null, scheduledAt, queueTimerMinutes, map });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 rounded-xl px-4 py-3">
        <span>Failed to load rounds</span>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-6 text-xs text-red-300">
          <RefreshCw className="w-3 h-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">{groupName} — Rounds</h4>
        {allowCreateLobby && (
          <Button
            onClick={handleCreateRound}
            disabled={createLobby.isPending}
            size="sm"
            className="h-7 text-xs bg-white/5 border border-white/10 text-white hover:bg-white/10"
          >
            <Plus className="w-3 h-3 mr-1" />
            {createLobby.isPending ? 'Creating...' : 'New Lobby'}
          </Button>
        )}
      </div>

      {/* Round List */}
      {rounds.length === 0 ? (
        <p className="text-xs text-zinc-600 text-center py-6">
          No rounds yet. Click "New Round" to create the first round.
        </p>
      ) : (
        <div className="space-y-2">
          {rounds.map((round) => (
            <RoundRow
              key={round.id}
              round={round}
              stageId={stageId}
              groupId={groupId}
              teams={teams}
              scoringPreset={scoringPreset}
              mapConfig={mapConfig}
              mapCatalogItems={mapCatalogItems}
              isExpanded={expandedRoundId === round.id}
               onToggle={() => setExpandedRoundId(expandedRoundId === round.id ? null : round.id)}
               onStatusAction={(action, settings) => {
                 if (action === 'start' && !settings?.lobbyCode) {
                   toast({
                     title: 'Lobby code required',
                    description: 'Enter the lobby code before starting the round so players receive it immediately.',
                    variant: 'destructive',
                   });
                   return;
                 }

                 if (BR_FEATURE_FLAGS.mapsEnabled && action === 'start' && mapConfig.mode === 'per_round' && !round.map && !settings?.map) {
                   toast({
                     title: 'Map required',
                     description: 'Select a map for this round before starting it.',
                     variant: 'destructive',
                   });
                   return;
                 }

                  if (action === 'complete' && (round.pending_evidence_count ?? 0) > 0) {
                    toast({
                      title: 'Evidence review required',
                      description: 'Review or reopen all pending evidence submissions before completing this round.',
                      variant: 'destructive',
                    });
                    return;
                  }

                 setConfirmAction({ roundId: round.id, roundNumber: round.round_number ?? round.wave_number, action, settings });
               }}
              onRoundSettingsSave={(settings) => handleLobbyCodeUpdate(
                round.id,
                settings.lobbyCode,
                settings.scheduledAt,
                settings.queueTimerMinutes,
                settings.map,
              )}
              isUpdating={isMutatingRound}
              realtimeConnected={connected}
            />
          ))}
        </div>
      )}

      {/* Status Change Confirmation */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="bg-[#121214] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {confirmAction?.action === 'start' && 'Start Round?'}
              {confirmAction?.action === 'complete' && 'Complete Round?'}
              {confirmAction?.action === 'reopen' && 'Re-open Round?'}
              {confirmAction?.action === 'reset' && 'Reset Round?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {confirmAction?.action === 'start' && 'This will publish the current lobby code, schedule, and queue timer, then set the round live for players.'}
              {confirmAction?.action === 'complete' && 'This will lock the round results. You can re-open later if needed.'}
              {confirmAction?.action === 'reopen' && 'This will unlock the round for result editing. Any leaderboard standings calculated from this round may change if results are modified.'}
              {confirmAction?.action === 'reset' && 'This will clear the lobby code, schedule, queue timer, results, and submitted evidence, then move the round back to pending.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              className={
                confirmAction?.action === 'start'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : confirmAction?.action === 'complete'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : confirmAction?.action === 'reset'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }
            >
              {confirmAction?.action === 'start' && 'Start Round'}
              {confirmAction?.action === 'complete' && 'Complete Round'}
              {confirmAction?.action === 'reopen' && 'Re-open'}
              {confirmAction?.action === 'reset' && 'Reset Round'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ── RoundRow (internal) ─────────────────────────────────────────────────────

export interface RoundRowProps {
  round: BRRound;
  stageId: string;
  groupId: string;
  teams: BRGroupTeam[];
  scoringPreset: ScoringPreset;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusAction: (action: RoundAction, settings?: RoundActionSettings) => void;
  onRoundSettingsSave: (settings: { lobbyCode: string; scheduledAt: string | null; queueTimerMinutes: number | null; map?: string | null }) => Promise<void>;
  isUpdating: boolean;
  realtimeConnected?: boolean;
  mapConfig: BRMapConfig;
  mapCatalogItems: BRMapCatalogItem[];
  /** e.g. "A + B" for rotation lobbies */
  matchupLabel?: string;
}

export const RoundRow: React.FC<RoundRowProps> = ({
  round,
  stageId,
  groupId,
  teams,
  scoringPreset,
  isExpanded,
  onToggle,
  onStatusAction,
  onRoundSettingsSave,
  isUpdating,
  realtimeConnected = false,
  mapConfig,
  mapCatalogItems,
  matchupLabel,
}) => {
  const { results, isLoading: resultsLoading, submitResults } = useBRLobbyResults(
    isExpanded ? round.id : null,
    stageId,
    groupId
  );
  const [lobbyCode, setLobbyCode] = useState(round.lobby_code ?? '');
  const [queueTimerInput, setQueueTimerInput] = useState(
    round.queue_timer_minutes != null ? String(round.queue_timer_minutes) : ''
  );
  const [mapInput, setMapInput] = useState(round.map ?? '');
  const selectedMapItem = useMemo(
    () => mapCatalogItems.find((item) => item.name === (mapInput || round.map || '')),
    [mapCatalogItems, round.map, mapInput],
  );
  const [settingsDirty, setSettingsDirty] = useState(false);
  const statusCfg = STATUS_CONFIG[round.status] ?? STATUS_CONFIG.pending;
  const hasPendingEvidenceReview = (round.pending_evidence_count ?? 0) > 0;
  const hasSavedFullResults = useMemo(() => {
    if (teams.length === 0 || results.length !== teams.length) return false;
    const rosterIds = new Set(teams.map((team) => team.team_id));
    const resultIds = new Set(results.map((result) => result.team_id));
    return teams.every((team) => resultIds.has(team.team_id))
      && results.every((result) => rosterIds.has(result.team_id));
  }, [teams, results]);
  const hasRoundState = round.status !== 'pending'
    || round.result_count > 0
    || (round.evidence_count ?? 0) > 0
    || !!round.lobby_code
    || !!round.scheduled_at
    || round.queue_timer_minutes != null
    || !!round.queue_started_at;

  useEffect(() => {
    setLobbyCode(round.lobby_code ?? '');
    setQueueTimerInput(round.queue_timer_minutes != null ? String(round.queue_timer_minutes) : '');
    setMapInput(round.map ?? resolveMapForRound(mapConfig, round.round_number ?? round.wave_number) ?? '');
    setSettingsDirty(false);
  }, [round.id, round.lobby_code, round.queue_timer_minutes, round.map, round.round_number, round.wave_number, mapConfig]);

  const getRoundSettings = (): RoundActionSettings => {
    const trimmedLobbyCode = lobbyCode.trim();
    const trimmedTimer = queueTimerInput.trim();
    const parsedTimer = trimmedTimer === '' ? null : Number(trimmedTimer);

    return {
      lobbyCode: trimmedLobbyCode === '' ? null : trimmedLobbyCode,
      scheduledAt: round.scheduled_at ?? null,
      queueTimerMinutes: Number.isFinite(parsedTimer) ? parsedTimer : null,
      map: BR_FEATURE_FLAGS.mapsEnabled && mapConfig.mode !== 'none' ? (mapInput.trim() || null) : null,
    };
  };

  const handleSettingsSave = async () => {
    if (!settingsDirty) return;

    const settings = getRoundSettings();
    await onRoundSettingsSave({
      lobbyCode: settings.lobbyCode ?? '',
      scheduledAt: settings.scheduledAt,
      queueTimerMinutes: settings.queueTimerMinutes,
      map: settings.map,
    });
    setSettingsDirty(false);
  };

  const handleResultSave = async (resultInputs: BRResultInput[]) => {
    await submitResults.mutateAsync({ lobbyId: round.id, results: resultInputs });
  };

  return (
    <div className="bg-[#0a0a0c] border border-white/5 rounded-xl overflow-hidden">
      {/* Round Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-white">
          {matchupLabel ? `Match: ${matchupLabel}` : `Lobby ${round.round_number ?? round.wave_number}`}
        </span>
        {matchupLabel && (
          <span className="text-[10px] text-zinc-500 font-mono">W{round.wave_number ?? round.round_number}</span>
        )}
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusCfg.color}`}>
          {statusCfg.label}
        </Badge>
        {round.result_count > 0 && (
          <span className="text-[10px] text-zinc-600">
            {round.result_count} results
          </span>
        )}
        {!!round.evidence_count && (
          <span className="text-[10px] text-zinc-600">
            {round.evidence_count} evidence
          </span>
        )}
        {!!round.pending_evidence_count && (
          <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-300">
            {round.pending_evidence_count} pending review
          </Badge>
        )}
        <span className="ml-auto flex flex-wrap items-center justify-end gap-3 text-[10px] text-zinc-600">
          {round.scheduled_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(round.scheduled_at).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
            </span>
          )}
          {round.queue_timer_minutes ? `Queue ${round.queue_timer_minutes}m` : null}
          {BR_FEATURE_FLAGS.mapsEnabled && round.map ? (
            <span className="inline-flex items-center gap-1 text-emerald-400/80">
              <MapPin className="w-3 h-3" />
              <BRMapBadge
                mapName={round.map}
                imageUrl={mapCatalogItems.find((item) => item.name === round.map)?.imageUrl}
              />
            </span>
          ) : null}
          {round.lobby_code ? `${round.lobby_code}` : 'No lobby code'}
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/5 px-4 py-4 space-y-4">
          {/* Round Settings + Actions Row */}
          <div className="space-y-3">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
                <label className="mb-2 flex text-[10px] text-zinc-500 uppercase tracking-wider items-center gap-1">
                  <Key className="w-3 h-3" /> Lobby Code
                </label>
                <Input
                  value={lobbyCode}
                  onChange={(e) => { setLobbyCode(e.target.value); setSettingsDirty(true); }}
                  placeholder="Enter lobby code..."
                  disabled={round.status === 'completed'}
                  className="h-10 text-sm bg-white/5 border-white/10 text-white"
                />
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
                  The code becomes visible to players only when the round is live.
                </p>
              </div>

              <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
                <label className="mb-2 flex text-[10px] text-zinc-500 uppercase tracking-wider items-center gap-1">
                  <Clock className="w-3 h-3" /> Queue Timer (minutes)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={180}
                  value={queueTimerInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setQueueTimerInput('');
                    } else {
                      const clamped = Math.max(0, Math.min(180, Number.parseInt(raw, 10) || 0));
                      setQueueTimerInput(String(clamped));
                    }
                    setSettingsDirty(true);
                  }}
                  placeholder="e.g. 5"
                  disabled={round.status === 'completed'}
                  className="h-10 text-sm bg-white/5 border-white/10 text-white"
                />
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
                  Countdown starts when the round is live and the lobby code is visible.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1 text-zinc-400">
                <Clock className="w-3 h-3" />
                {round.scheduled_at
                  ? `Scheduled ${new Date(round.scheduled_at).toLocaleString('en-GB', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })} — edit in the Schedule tab`
                  : 'Lobby start times are set in the Schedule tab, not here.'}
              </span>
            </div>

            {BR_FEATURE_FLAGS.mapsEnabled && mapConfig.mode !== 'none' && (
              <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
                <label className="mb-2 flex text-[10px] text-zinc-500 uppercase tracking-wider items-center gap-1">
                  <MapPin className="w-3 h-3" /> Map
                </label>
                {mapConfig.mode === 'per_round' ? (
                  mapCatalogItems.length > 0 ? (
                    <BRMapOptionList
                      items={mapCatalogItems}
                      selected={mapInput ? [mapInput] : []}
                      onToggle={(mapName, checked) => {
                        setMapInput(checked ? mapName : '');
                        setSettingsDirty(true);
                      }}
                      columns={2}
                    />
                  ) : (
                    <Select value={mapInput || undefined} onValueChange={(value) => { setMapInput(value); setSettingsDirty(true); }}>
                      <SelectTrigger className="h-10 text-sm bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Select map..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mapConfig.pool.map((mapName) => (
                          <SelectItem key={mapName} value={mapName}>{mapName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                ) : (
                  <div className="h-10 flex items-center px-3 rounded-md bg-white/5 border border-white/10 text-sm text-zinc-300">
                    {selectedMapItem ? (
                      <BRMapBadge mapName={selectedMapItem.name} imageUrl={selectedMapItem.imageUrl} />
                    ) : (
                      round.map ?? resolveMapForRound(mapConfig, round.round_number ?? round.wave_number) ?? '—'
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-white">Round controls</p>
                  <p className="text-[10px] leading-relaxed text-zinc-500">
                    Saving updates the round draft instantly. Starting a round also publishes the current lobby code, schedule, and queue timer automatically.
                  </p>
                  {hasPendingEvidenceReview && round.status === 'active' && (
                    <p className="text-[10px] leading-relaxed text-amber-300/80">
                      Complete is locked until all submitted evidence is reviewed.
                    </p>
                  )}
                  {!hasSavedFullResults && round.status === 'active' && (
                    <p className="text-[10px] leading-relaxed text-amber-300/80">
                      Save Results first, then complete the round.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button
                    size="sm"
                    onClick={handleSettingsSave}
                    disabled={!settingsDirty || isUpdating}
                    className="h-9 text-xs bg-white/10 hover:bg-white/15 text-white disabled:bg-white/5 disabled:text-zinc-600"
                  >
                    Save settings
                  </Button>
                  {round.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => onStatusAction('start', getRoundSettings())}
                      disabled={isUpdating}
                      className="h-9 text-xs bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/20"
                    >
                      <Play className="w-3 h-3 mr-1" /> Start
                    </Button>
                  )}
                  {round.status === 'active' && (
                    <Button
                      size="sm"
                      onClick={() => onStatusAction('complete')}
                      disabled={isUpdating || hasPendingEvidenceReview || !hasSavedFullResults}
                      className="h-9 text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Complete
                    </Button>
                  )}
                  {round.status === 'completed' && (
                    <Button
                      size="sm"
                      onClick={() => onStatusAction('reopen')}
                      disabled={isUpdating}
                      className="h-9 text-xs bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/20"
                    >
                      <Undo2 className="w-3 h-3 mr-1" /> Re-open
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusAction('reset')}
                    disabled={!hasRoundState || isUpdating}
                    className="h-9 text-xs border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15 disabled:border-white/10 disabled:bg-white/5 disabled:text-zinc-600"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <RoundEvidencePanel
            roundId={round.id}
            stageId={stageId}
            groupId={groupId}
            realtimeConnected={realtimeConnected}
          />

          <BRGameRunList
            lobbyId={round.id}
            stageId={stageId}
            groupId={groupId}
            teams={teams}
            scoringPreset={scoringPreset}
            mapConfig={mapConfig}
            mapCatalogItems={mapCatalogItems}
          />
        </div>
      )}
    </div>
  );
};
