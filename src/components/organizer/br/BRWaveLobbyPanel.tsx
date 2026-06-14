import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { RefreshCw } from 'lucide-react';
import { RoundRow } from '@/components/organizer/br/RoundManagementPanel';

interface ScoringPreset {
  placements: number[];
  killPoints: number;
  killCap: number | null;
}
import { useStageLobbiesDeduped, useBRLobbies } from '@/hooks/useBRLobbies';
import { useBRLobbyRoster } from '@/hooks/useBRLobbyRoster';
import { useBRStageSchedule } from '@/hooks/useBRStageSchedule';
import { useBRRealtime } from '@/hooks/useBRRealtime';
import { useToast } from '@/hooks/use-toast';
import type { BRGroup } from '@/types/brGroups';
import type { BRRound } from '@/types/brLobbies';
import type { BRMapConfig, BRMapCatalogItem } from '@/types/battleRoyale';
import {
  formatRotationMatchdayLabel,
  groupLobbiesByWave,
  resolveMatchupLabelFromLobby,
  seedGroupShortLabel,
  summarizeGroupRotationSchedule,
} from '@/utils/brWaveScheduleDisplay';
import { validateLiveActionInTournamentWindow } from '@/utils/tournamentScheduleValidation';

interface BRWaveLobbyPanelProps {
  stageId: string;
  groups: BRGroup[];
  seedGroupCount: number;
  gamesPerMatch?: number;
  scoringPreset: ScoringPreset;
  mapConfig: BRMapConfig;
  mapCatalogItems?: BRMapCatalogItem[];
  tournamentStartDate?: string | null;
  tournamentEndDate?: string | null;
}

const groupIdsForMatchup = (matchupLabel: string, groups: BRGroup[]): string[] => {
  const parts = matchupLabel.split('+').map((s) => s.trim().replace(/^group\s+/i, '').toUpperCase());
  return parts
    .map((part) => groups.find((g) => seedGroupShortLabel(g.name).toUpperCase() === part)?.id)
    .filter((id): id is string => Boolean(id));
};

const RotationLobbyRow: React.FC<{
  lobby: BRRound;
  stageId: string;
  groups: BRGroup[];
  seedGroupCount: number;
  formation: ReturnType<typeof useBRStageSchedule>['schedule'];
  scoringPreset: ScoringPreset;
  mapConfig: BRMapConfig;
  mapCatalogItems: BRMapCatalogItem[];
  tournamentStartDate?: string | null;
  tournamentEndDate?: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusAction: Parameters<typeof RoundRow>[0]['onStatusAction'];
  onRoundSettingsSave: Parameters<typeof RoundRow>[0]['onRoundSettingsSave'];
  isUpdating: boolean;
}> = ({
  lobby,
  stageId,
  groups,
  seedGroupCount,
  formation,
  scoringPreset,
  mapConfig,
  mapCatalogItems,
  tournamentStartDate,
  tournamentEndDate,
  isExpanded,
  onToggle,
  onStatusAction,
  onRoundSettingsSave,
  isUpdating,
}) => {
  const matchupLabel = resolveMatchupLabelFromLobby(
    lobby,
    groups,
    formation,
    seedGroupCount,
  );
  const rosterGroupIds = lobby.group_ids?.length
    ? lobby.group_ids
    : groupIdsForMatchup(matchupLabel, groups);
  const primaryGroupId = rosterGroupIds[0] ?? groups[0]?.id ?? '';
  const { teams, isLoading } = useBRLobbyRoster(stageId, rosterGroupIds);
  const { connected } = useBRRealtime({
    stageId,
    groupId: primaryGroupId,
    lobbyId: isExpanded ? lobby.id : null,
  });

  if (isLoading && teams.length === 0) {
    return <div className="h-14 bg-white/5 rounded-xl animate-pulse" />;
  }

  return (
    <RoundRow
      round={lobby}
      stageId={stageId}
      groupId={primaryGroupId}
      teams={teams}
      scoringPreset={scoringPreset}
      mapConfig={mapConfig}
      mapCatalogItems={mapCatalogItems}
      isExpanded={isExpanded}
      onToggle={onToggle}
      onStatusAction={onStatusAction}
      onRoundSettingsSave={onRoundSettingsSave}
      isUpdating={isUpdating}
      realtimeConnected={connected}
      tournamentStartDate={tournamentStartDate}
      tournamentEndDate={tournamentEndDate}
      matchupLabel={matchupLabel}
    />
  );
};

export const BRWaveLobbyPanel: React.FC<BRWaveLobbyPanelProps> = ({
  stageId,
  groups,
  seedGroupCount,
  gamesPerMatch = 6,
  scoringPreset,
  mapConfig,
  mapCatalogItems = [],
  tournamentStartDate,
  tournamentEndDate,
}) => {
  const { toast } = useToast();
  const [expandedLobbyId, setExpandedLobbyId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    lobby: BRRound;
    action: 'start' | 'complete' | 'reopen' | 'reset';
    settings?: {
      lobbyCode: string | null;
      scheduledAt: string | null;
      queueTimerMinutes: number | null;
      map?: string | null;
    };
  } | null>(null);
  const { lobbies, isLoading, error, refetch } = useStageLobbiesDeduped(stageId, groups);
  const { schedule: formation } = useBRStageSchedule(stageId);
  const { updateLobby, resetLobby } = useBRLobbies(stageId, groups[0]?.id ?? null);
  const isMutating = updateLobby.isPending || resetLobby.isPending;

  const rotationSummary = useMemo(
    () => summarizeGroupRotationSchedule(seedGroupCount, gamesPerMatch),
    [seedGroupCount, gamesPerMatch],
  );

  const waves = useMemo(() => groupLobbiesByWave(lobbies), [lobbies]);

  const handleLobbyCodeUpdate = async (
    roundId: string,
    lobbyCode: string,
    scheduledAt: string | null,
    queueTimerMinutes: number | null,
    map?: string | null,
  ) => {
    const lobby = lobbies.find((item) => item.id === roundId);
    const usesPerGameQueue = (lobby?.game_count ?? 0) > 0;
    await updateLobby.mutateAsync({
      lobbyId: roundId,
      lobbyCode: lobbyCode || null,
      scheduledAt,
      ...(usesPerGameQueue ? {} : { queueTimerMinutes }),
      map,
    });
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { lobby, action, settings } = confirmAction;
    const roundNumber = lobby.round_number ?? lobby.wave_number;
    const usesPerGameQueue = (lobby.game_count ?? 0) > 0;
    const statusMap = { start: 'active', complete: 'completed', reopen: 'active' } as const;
    try {
      if (action === 'reset') {
        await resetLobby.mutateAsync({ lobbyId: lobby.id, roundNumber });
      } else if (action === 'start') {
        await updateLobby.mutateAsync({
          lobbyId: lobby.id,
          status: statusMap[action],
          lobbyCode: settings?.lobbyCode ?? null,
          scheduledAt: settings?.scheduledAt ?? null,
          ...(usesPerGameQueue ? {} : { queueTimerMinutes: settings?.queueTimerMinutes ?? null }),
          map: settings?.map ?? null,
        });
      } else {
        await updateLobby.mutateAsync({ lobbyId: lobby.id, status: statusMap[action] });
      }
    } catch {
      /* toast in hook */
    } finally {
      setConfirmAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 rounded-xl px-4 py-3">
        <span>Failed to load lobbies</span>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-6 text-xs text-red-300">
          <RefreshCw className="w-3 h-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  if (lobbies.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-sm text-zinc-400">No matches yet.</p>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          Go to the <strong className="text-zinc-300">Schedule</strong> tab and click{' '}
          <strong className="text-zinc-300">Create matches</strong>. Each round pairs two groups
          (e.g. Group A + Group B) into one playable match.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-zinc-400 space-y-1">
        <p>
          <strong className="text-rose-200">{rotationSummary.title}</strong>
          {' '}— each row is one cross-group match ({rotationSummary.gamesPerMatch} scored games, same roster).
        </p>
        <p className="text-zinc-500">{rotationSummary.notDoubleRoundRobinNote}</p>
      </div>

      {[...waves.entries()].map(([waveNumber, waveLobbies]) => (
        <section key={waveNumber} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {formatRotationMatchdayLabel(waveNumber)} · {waveLobbies.length} cross-group match{waveLobbies.length === 1 ? '' : 'es'}
          </h4>
          <div className="space-y-2">
            {waveLobbies.map((lobby) => (
              <RotationLobbyRow
                key={lobby.id}
                lobby={lobby}
                stageId={stageId}
                groups={groups}
                seedGroupCount={seedGroupCount}
                formation={formation}
                scoringPreset={scoringPreset}
                mapConfig={mapConfig}
                mapCatalogItems={mapCatalogItems}
                tournamentStartDate={tournamentStartDate}
                tournamentEndDate={tournamentEndDate}
                isExpanded={expandedLobbyId === lobby.id}
                onToggle={() =>
                  setExpandedLobbyId(expandedLobbyId === lobby.id ? null : lobby.id)
                }
                onStatusAction={(action, settings) => {
                  if (action === 'start' && !settings?.lobbyCode) {
                    toast({
                      title: 'Lobby code required',
                      description: 'Enter the lobby code before starting the match.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  if (action === 'start') {
                    const windowErr = validateLiveActionInTournamentWindow(
                      tournamentStartDate,
                      tournamentEndDate,
                      'Starting a round',
                    );
                    if (windowErr) {
                      toast({
                        title: 'Outside tournament window',
                        description: windowErr,
                        variant: 'destructive',
                      });
                      return;
                    }
                  }
                  setConfirmAction({ lobby, action, settings });
                }}
                onRoundSettingsSave={(settings) =>
                  handleLobbyCodeUpdate(
                    lobby.id,
                    settings.lobbyCode,
                    settings.scheduledAt,
                    settings.queueTimerMinutes,
                    settings.map,
                  )
                }
                isUpdating={isMutating}
              />
            ))}
          </div>
        </section>
      ))}

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="bg-[#121214] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm match action</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {confirmAction?.action === 'start' && 'Publish the lobby code and set this match live.'}
              {confirmAction?.action === 'complete' && 'Lock results for this match.'}
              {confirmAction?.action === 'reopen' && 'Allow editing results again.'}
              {confirmAction?.action === 'reset' && 'Clear code, results, and evidence for this match.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={runConfirmedAction} className="bg-emerald-600 hover:bg-emerald-500">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BRWaveLobbyPanel;
