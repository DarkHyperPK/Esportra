import React, { useState, useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Users, Loader2, AlertCircle, Clock } from 'lucide-react';
import { BR_FEATURE_FLAGS } from '@/config/brFeatureFlags';
import { useSearchParams } from 'react-router-dom';
import {
  useBRGroupStage,
  useBRGroupLeaderboard,
  useBRGroupRounds,
  useBRStageLeaderboard,
} from '@/hooks/useBRGroupLeaderboard';
import { useBRRealtime } from '@/hooks/useBRRealtime';
import BRLeaderboard from '@/components/tournament/br/BRLeaderboard';
import { apiClient } from '@/lib/apiClient';
import type { BRStageFormat } from '@/types/battleRoyale';
import type { BRGame } from '@/types/brLobbies';
import type { BRGroup } from '@/types/brGroups';
import { formatPublicLobbyLabel, getPublicBRScheduleCopy } from '@/utils/brScheduleLabels';
import { seedGroupShortLabel } from '@/utils/brWaveScheduleDisplay';

export type BRGroupStageViewMode = 'leaderboard' | 'schedule';

interface BRGroupStageViewProps {
  stageId: string;
  gameName?: string;
  stageFormat?: BRStageFormat | string;
  /** Number of teams that qualify from each group (for cutoff line) */
  qualificationCount?: number;
  /** Leaderboard-only or schedule-only rendering */
  mode?: BRGroupStageViewMode;
}

const BRGroupStageView: React.FC<BRGroupStageViewProps> = ({
  stageId,
  gameName,
  stageFormat,
  qualificationCount,
  mode = 'leaderboard',
}) => {
  const [searchParams] = useSearchParams();
  const { groups, isLoading, error, refetch } = useBRGroupStage(stageId);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const requestedGroupId = searchParams.get('brGroup');
  const showGroupSelector =
    stageFormat !== 'single_lobby' && groups.length > 1;

  // Reset group selection when stage changes
  useEffect(() => {
    setSelectedGroupId(null);
  }, [stageId, requestedGroupId]);

  // Validate that the selected group still exists in the loaded list (guards against stale state after group deletion)
  const activeGroupId = (selectedGroupId && groups.some(g => g.id === selectedGroupId))
    ? selectedGroupId
    : (requestedGroupId && groups.some(g => g.id === requestedGroupId))
      ? requestedGroupId
      : groups[0]?.id ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-zinc-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Failed to load group stage data.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Groups haven't been set up yet.</p>
      </div>
    );
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  return (
    <div className="space-y-4">
      {showGroupSelector && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setSelectedGroupId(group.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border',
                activeGroupId === group.id
                  ? 'bg-rose-500/15 border-transparent text-rose-400'
                  : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              {group.name}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {group.team_count}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {activeGroupId && (
        <GroupContent
          stageId={stageId}
          groupId={activeGroupId}
          groupName={activeGroup?.name ?? 'Group'}
          groups={groups}
          stageFormat={stageFormat}
          qualificationCount={qualificationCount}
          mode={mode}
        />
      )}
    </div>
  );
};

interface GroupContentProps {
  stageId: string;
  groupId: string;
  groupName: string;
  groups: BRGroup[];
  stageFormat?: BRStageFormat | string;
  qualificationCount?: number;
  mode: BRGroupStageViewMode;
}

const GroupContent: React.FC<GroupContentProps> = ({
  stageId,
  groupId,
  groupName,
  groups,
  stageFormat,
  qualificationCount,
  mode,
}) => {
  const useStageGlobalLeaderboard =
    stageFormat === 'single_lobby' || stageFormat === 'group_rotation';
  const { connected } = useBRRealtime({ stageId, groupId });
  const pollIntervalMs = connected ? false : 30_000;
  const isLeaderboardMode = mode === 'leaderboard';
  const isScheduleMode = mode === 'schedule';
  const isSingleLobby = stageFormat === 'single_lobby';

  const {
    leaderboard: groupLeaderboard,
    isLoading: groupLbLoading,
    error: groupLbError,
    refetch: refetchGroupLb,
  } = useBRGroupLeaderboard(stageId, groupId, {
    enabled: isLeaderboardMode && !useStageGlobalLeaderboard,
    refetchIntervalMs: pollIntervalMs,
  });
  const {
    leaderboard: stageLeaderboard,
    isLoading: stageLbLoading,
    error: stageLbError,
    refetch: refetchStageLb,
  } = useBRStageLeaderboard(stageId, {
    enabled: isLeaderboardMode && useStageGlobalLeaderboard,
    refetchIntervalMs: pollIntervalMs,
  });
  const leaderboard = useStageGlobalLeaderboard ? stageLeaderboard : groupLeaderboard;
  const lbLoading = useStageGlobalLeaderboard ? stageLbLoading : groupLbLoading;
  const lbError = useStageGlobalLeaderboard ? stageLbError : groupLbError;
  const refetchLb = useStageGlobalLeaderboard ? refetchStageLb : refetchGroupLb;
  const {
    totalRounds,
    totalGames,
    completedGames,
    rounds,
    isLoading: roundsLoading,
  } = useBRGroupRounds(stageId, groupId, {
    enabled: true,
    refetchIntervalMs: pollIntervalMs,
    realtimeConnected: connected,
  });

  const scheduleCopy = getPublicBRScheduleCopy(stageFormat);
  const shortGroupName = seedGroupShortLabel(groupName);

  const lobbyGameQueries = useQueries({
    queries: rounds.map((lobby) => ({
      queryKey: ['br-games', lobby.id],
      queryFn: () => apiClient.get<BRGame[]>(`/api/lobbies/${lobby.id}/games`),
      enabled: isScheduleMode && !scheduleCopy.isRotation && !!lobby.id,
      staleTime: 1000 * 30,
    })),
  });

  const gamesByLobbyId = useMemo(() => {
    const map = new Map<string, BRGame[]>();
    rounds.forEach((lobby, index) => {
      const games = lobbyGameQueries[index]?.data ?? [];
      map.set(lobby.id, [...games].sort((a, b) => a.game_number - b.game_number));
    });
    return map;
  }, [lobbyGameQueries, rounds]);

  const isLoading = (isLeaderboardMode && lbLoading) || (isScheduleMode && roundsLoading);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isLeaderboardMode && lbError) {
    return (
      <Card className="bg-black/20 border border-white/10 rounded-2xl">
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
          <p className="text-sm text-zinc-400">Failed to load leaderboard.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetchLb()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isScheduleMode) {
    return (
      <div className="space-y-4">
        {!roundsLoading && totalRounds === 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
            <Clock className="w-4 h-4 text-zinc-600 flex-shrink-0" />
            <p className="text-xs text-zinc-500">No lobbies have been created yet. The organizer will start games soon.</p>
          </div>
        )}

        {rounds.length > 0 && (
          <Card className="bg-black/20 border border-white/10 rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-semibold text-white">{scheduleCopy.scheduleTitle}</h3>
                {!scheduleCopy.isRotation && !isSingleLobby && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-zinc-400">
                    {shortGroupName}
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {scheduleCopy.isRotation ? (
                  rounds.map((lobby, lobbyIndex) => (
                    <div
                      key={lobby.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                    >
                      <div>
                        <p className="text-sm text-white font-medium">
                          {formatPublicLobbyLabel(lobby, {
                            format: stageFormat,
                            groupName,
                            lobbyIndex,
                            totalLobbiesInGroup: rounds.length,
                            seedGroupCount: groups.length,
                            groups,
                          })}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {(lobby.games_completed ?? 0)}/{(lobby.game_count ?? 1)} scored game{(lobby.game_count ?? 1) === 1 ? '' : 's'} · {lobby.status}
                        </p>
                      </div>
                      {lobby.scheduled_at && (
                        <p className="text-[10px] text-zinc-400">
                          {new Date(lobby.scheduled_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  rounds.map((lobby, lobbyIndex) => {
                    const games = gamesByLobbyId.get(lobby.id) ?? [];
                    const lobbyLabel = formatPublicLobbyLabel(lobby, {
                      format: stageFormat,
                      groupName,
                      lobbyIndex,
                      totalLobbiesInGroup: rounds.length,
                    });
                    const showLobbyLabel = !isSingleLobby && rounds.length > 1;

                    if (games.length === 0) {
                      return (
                        <div
                          key={lobby.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                        >
                          <div>
                            <p className="text-sm text-white font-medium">
                              {isSingleLobby ? `Game ${lobbyIndex + 1}` : lobbyLabel}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {(lobby.games_completed ?? 0)}/{(lobby.game_count ?? 1)} games · {lobby.status}
                            </p>
                          </div>
                          {lobby.scheduled_at && (
                            <p className="text-[10px] text-zinc-400">
                              {new Date(lobby.scheduled_at).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={lobby.id} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 space-y-2">
                        {showLobbyLabel && (
                          <p className="text-xs font-medium text-zinc-300">{lobbyLabel}</p>
                        )}
                        {games.map((game) => (
                          <div
                            key={game.id}
                            className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 first:border-t-0 first:pt-0 pt-2"
                          >
                            <div>
                              <p className="text-sm text-white font-medium">
                                Game {game.game_number}
                                {BR_FEATURE_FLAGS.mapsEnabled && game.map ? (
                                  <span className="text-zinc-400 font-normal"> · {game.map}</span>
                                ) : null}
                              </p>
                              <p className="text-[10px] text-zinc-500 capitalize">{game.status}</p>
                            </div>
                            {(game.scheduled_at || lobby.scheduled_at) && (
                              <p className="text-[10px] text-zinc-400">
                                {new Date(game.scheduled_at ?? lobby.scheduled_at!).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <BRLeaderboard
      entries={leaderboard}
      totalGames={totalGames}
      gamesCompleted={completedGames}
      qualificationCutoff={qualificationCount}
      pageSize={20}
    />
  );
};

export default BRGroupStageView;
