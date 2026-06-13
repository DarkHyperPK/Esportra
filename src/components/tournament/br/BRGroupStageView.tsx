import React, { useState, useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Users, Swords, Loader2, AlertCircle, Clock } from 'lucide-react';
import { BR_FEATURE_FLAGS } from '@/config/brFeatureFlags';
import { useGameCatalogGame } from '@/hooks/useGameCatalogGame';
import { getMapImageUrl } from '@/utils/gameCatalogBr';
import { BRMapBadge } from '@/components/organizer/br/BRMapOptionList';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBRGroupStage, useBRGroupLeaderboard, useBRGroupRounds } from '@/hooks/useBRGroupLeaderboard';
import { useBRGames } from '@/hooks/useBRGames';
import { useBRGroupParticipants } from '@/hooks/useBRGroups';
import { useBRRealtime } from '@/hooks/useBRRealtime';
import BRLeaderboard from '@/components/tournament/br/BRLeaderboard';
import { apiClient } from '@/lib/apiClient';
import type { BRStageFormat } from '@/types/battleRoyale';
import type { BRGame } from '@/types/brLobbies';
import { formatPublicLobbyLabel, getPublicBRScheduleCopy } from '@/utils/brScheduleLabels';
import { resolveActiveBRGameMap } from '@/utils/brGameContext';
import { formatRotationMatchdayLabel, seedGroupShortLabel } from '@/utils/brWaveScheduleDisplay';

interface BRGroupStageViewProps {
  stageId: string;
  gameName?: string;
  stageFormat?: BRStageFormat | string;
  /** Number of teams that qualify from each group (for cutoff line) */
  qualificationCount?: number;
  /** If provided, renders a "Match Room" CTA button */
  tournamentSlug?: string;
}

const BRGroupStageView: React.FC<BRGroupStageViewProps> = ({
  stageId,
  gameName,
  stageFormat,
  qualificationCount,
  tournamentSlug,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { groups, isLoading, error, refetch } = useBRGroupStage(stageId);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const requestedGroupId = searchParams.get('brGroup');

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
      {tournamentSlug && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate(`/tournaments/${tournamentSlug}/br-game-room`)}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1.5 rounded-lg bg-rose-500/8 border border-rose-500/20 hover:bg-rose-500/12 transition-colors"
          >
            <Swords className="w-3.5 h-3.5" />
            Match Room
          </button>
        </div>
      )}

      {/* Group tab selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setSelectedGroupId(group.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border',
              activeGroupId === group.id
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
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

      {/* Selected group content */}
      {activeGroupId && (
        <GroupContent
          stageId={stageId}
          groupId={activeGroupId}
          groupName={activeGroup?.name ?? 'Group'}
          stageFormat={stageFormat}
          gameName={gameName}
          qualificationCount={qualificationCount}
          tournamentSlug={tournamentSlug}
        />
      )}
    </div>
  );
};

interface GroupContentProps {
  stageId: string;
  groupId: string;
  groupName: string;
  stageFormat?: BRStageFormat | string;
  gameName?: string;
  qualificationCount?: number;
  tournamentSlug?: string;
}

const GroupContent: React.FC<GroupContentProps> = ({
  stageId,
  groupId,
  groupName,
  stageFormat,
  gameName,
  qualificationCount,
  tournamentSlug,
}) => {
  const navigate = useNavigate();
  const { data: catalogGame } = useGameCatalogGame(gameName);
  const { connected } = useBRRealtime({ stageId, groupId });
  const pollIntervalMs = connected ? false : 30_000;
  const { leaderboard, isLoading: lbLoading, error: lbError, refetch: refetchLb } = useBRGroupLeaderboard(
    stageId,
    groupId,
    { refetchIntervalMs: pollIntervalMs },
  );
  const {
    totalRounds,
    completedRounds,
    totalGames,
    completedGames,
    activeRound,
    rounds,
    isLoading: roundsLoading,
  } = useBRGroupRounds(stageId, groupId, {
    refetchIntervalMs: pollIntervalMs,
    realtimeConnected: connected,
  });
  const { data: activeLobbyGames = [] } = useBRGames(activeRound?.id ?? null);
  const { data: participants = [], isLoading: participantsLoading } = useBRGroupParticipants(stageId, groupId);

  const scheduleCopy = getPublicBRScheduleCopy(stageFormat);
  const shortGroupName = seedGroupShortLabel(groupName);
  const activeGameMap = resolveActiveBRGameMap(activeLobbyGames);

  const lobbyGameQueries = useQueries({
    queries: rounds.map((lobby) => ({
      queryKey: ['br-games', lobby.id],
      queryFn: () => apiClient.get<BRGame[]>(`/api/lobbies/${lobby.id}/games`),
      enabled: !scheduleCopy.isRotation && !!lobby.id,
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

  const isLoading = lbLoading || roundsLoading;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (lbError) {
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

  return (
    <div className="space-y-4">
      {/* No lobbies state */}
      {!roundsLoading && totalRounds === 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
          <Clock className="w-4 h-4 text-zinc-600 flex-shrink-0" />
          <p className="text-xs text-zinc-500">No lobbies have been created yet. The organizer will start games soon.</p>
        </div>
      )}

      {/* All lobbies complete, none active */}
      {!roundsLoading && totalRounds > 0 && !activeRound && completedGames < totalGames && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04]">
          <Clock className="w-4 h-4 text-amber-500/60 flex-shrink-0" />
          <p className="text-xs text-amber-300/70">
            Waiting for the next lobby to start. {completedGames}/{totalGames} games completed across {totalRounds} lobbies.
          </p>
        </div>
      )}

      {/* Active lobby banner */}
      {activeRound && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 animate-pulse-slow">
          <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Swords className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white">
              {scheduleCopy.liveBannerPrefix} — {shortGroupName}
              {activeLobbyGames.length > 0 && (
                <span className="text-zinc-400 font-normal">
                  {' '}· Game {activeLobbyGames.find((g) => g.status === 'active')?.game_number
                    ?? activeLobbyGames.filter((g) => g.status === 'completed').length + 1}
                  /{activeLobbyGames.length}
                </span>
              )}
              {scheduleCopy.isRotation && (
                <span className="text-zinc-400 font-normal">
                  {' '}· {formatRotationMatchdayLabel(activeRound.round_number ?? activeRound.wave_number ?? 1)}
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Lobby codes are only shared in the Match Room for registered players.
            </p>
            {BR_FEATURE_FLAGS.mapsEnabled && activeGameMap && (
              <div className="mt-1.5">
                <BRMapBadge
                  mapName={activeGameMap}
                  imageUrl={getMapImageUrl(catalogGame?.brConfig, activeGameMap)}
                />
              </div>
            )}
          </div>
          {tournamentSlug && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-shrink-0 border-rose-500/30 text-rose-300 hover:text-white hover:border-rose-500"
              onClick={() => navigate(`/tournaments/${tournamentSlug}/br-game-room`)}
            >
              Match Room
            </Button>
          )}
        </div>
      )}

      {rounds.length > 0 && (
        <Card className="bg-black/20 border border-white/10 rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-white">{scheduleCopy.scheduleTitle}</h3>
              {!scheduleCopy.isRotation && (
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

                  if (games.length === 0) {
                    return (
                      <div
                        key={lobby.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                      >
                        <div>
                          <p className="text-sm text-white font-medium">{lobbyLabel}</p>
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
                      {rounds.length > 1 && (
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

      {/* Group participants */}
      <Card className="bg-black/20 border border-white/10 rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-white">Participants</h3>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {participants.length}
            </Badge>
          </div>

          {participantsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : participants.length === 0 ? (
            <p className="text-xs text-zinc-500">No participants assigned to this group yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {participants.map((participant) => (
                <div
                  key={participant.team_id}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                >
                    {participant.logo_url ? (
                      <img
                        src={participant.logo_url}
                        alt={participant.team_name}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        className="w-8 h-8 rounded-full object-cover border border-white/10"
                      />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{participant.team_name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Seed {participant.seed_order}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <BRLeaderboard
        entries={leaderboard}
        totalGames={totalGames}
        gamesCompleted={completedGames}
        qualificationCutoff={qualificationCount}
        pageSize={20}
      />
    </div>
  );
};

export default BRGroupStageView;
