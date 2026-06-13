import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { BRGroup } from '@/types/brGroups';
import type { BRLeaderboardEntry } from '@/types/battleRoyale';
import type { BRRound } from '@/types/brLobbies';

interface GroupLeaderboardResponse {
  team_id: string;
  team_name: string;
  logo_url: string | null;
  games_played: number;
  total_placement_points: number;
  total_kill_points: number;
  total_points: number;
  total_kills: number;
  wins: number;
  best_placement: number;
}

function mapToLeaderboardEntry(row: GroupLeaderboardResponse): BRLeaderboardEntry | null {
  if (!row.team_id) return null;
  return {
    teamId: row.team_id,
    teamName: row.team_name || 'Unknown',
    teamLogo: row.logo_url ?? undefined,
    totalPoints: Number(row.total_points) || 0,
    totalKills: Number(row.total_kills) || 0,
    totalPlacementPoints: Number(row.total_placement_points) || 0,
    totalKillPoints: Number(row.total_kill_points) || 0,
    gamesPlayed: Number(row.games_played) || 0,
    wins: Number(row.wins) || 0,
    bestPlacement: Number(row.best_placement) || 0,
    perGameResults: [],
  };
}

const getRoundTimestamp = (value: string | null | undefined) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const selectPreferredActiveRound = (rounds: BRRound[]) => {
  const activeRounds = rounds.filter((round) => round.status === 'active');
  if (activeRounds.length === 0) return null;

  return [...activeRounds].sort((left, right) => {
    const queueStartedDifference = getRoundTimestamp(right.queue_started_at) - getRoundTimestamp(left.queue_started_at);
    if (queueStartedDifference !== 0) {
      return queueStartedDifference;
    }

    const liveCodeDifference = Number(Boolean(right.lobby_code)) - Number(Boolean(left.lobby_code));
    if (liveCodeDifference !== 0) {
      return liveCodeDifference;
    }

    const startedDifference = getRoundTimestamp(right.started_at) - getRoundTimestamp(left.started_at);
    if (startedDifference !== 0) {
      return startedDifference;
    }

    return (right.round_number ?? right.wave_number) - (left.round_number ?? left.wave_number);
  })[0];
};

export const useBRGroupStage = (stageId: string | null) => {
  const { data: groups, isLoading: groupsLoading, error: groupsError, refetch } = useQuery({
    queryKey: ['br-groups', stageId],
    queryFn: () => apiClient.get<BRGroup[]>(`/api/stages/${stageId}/br/groups`),
    enabled: !!stageId,
    staleTime: 1000 * 60 * 2,
  });

  return {
    groups: groups ?? [],
    isLoading: groupsLoading,
    error: groupsError,
    refetch,
    hasGroups: (groups?.length ?? 0) > 0,
  };
};

export const useBRGroupLeaderboard = (
  stageId: string | null,
  groupId: string | null,
  options: { refetchIntervalMs?: number | false } = {},
) => {
  const { refetchIntervalMs = false } = options;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['br-group-leaderboard', stageId, groupId],
    queryFn: async () => {
      const raw = await apiClient.get<GroupLeaderboardResponse[]>(
        `/api/stages/${stageId}/br/groups/${groupId}/leaderboard`
      );
      return raw.map(mapToLeaderboardEntry).filter((entry): entry is BRLeaderboardEntry => entry != null);
    },
    enabled: !!stageId && !!groupId,
    staleTime: 1000 * 30,
    refetchInterval: !!stageId && !!groupId ? refetchIntervalMs : false,
    refetchIntervalInBackground: Boolean(refetchIntervalMs),
  });

  return {
    leaderboard: data ?? [],
    isLoading,
    error,
    refetch,
  };
};

export const useBRStageLeaderboard = (
  stageId: string | null,
  options: { refetchIntervalMs?: number | false } = {},
) => {
  const { refetchIntervalMs = false } = options;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['br-stage-leaderboard', stageId],
    queryFn: async () => {
      const raw = await apiClient.get<GroupLeaderboardResponse[]>(
        `/api/stages/${stageId}/br/leaderboard`,
      );
      return raw.map(mapToLeaderboardEntry).filter((entry): entry is BRLeaderboardEntry => entry != null);
    },
    enabled: !!stageId,
    staleTime: 1000 * 30,
    refetchInterval: !!stageId ? refetchIntervalMs : false,
    refetchIntervalInBackground: Boolean(refetchIntervalMs),
  });

  return {
    leaderboard: data ?? [],
    isLoading,
    error,
    refetch,
  };
};

interface UseBRGroupRoundsOptions {
  enabled?: boolean;
  refetchIntervalMs?: number | false;
  realtimeConnected?: boolean;
}

export const useBRGroupRounds = (
  stageId: string | null,
  groupId: string | null,
  options: UseBRGroupRoundsOptions = {},
) => {
  const { enabled = true, refetchIntervalMs = false, realtimeConnected = false } = options;
  const effectiveInterval = realtimeConnected
    ? false
    : refetchIntervalMs;
  const { data, isLoading, error } = useQuery({
    queryKey: ['br-lobbies', stageId, groupId],
    queryFn: () =>
      apiClient.get<BRRound[]>(`/api/stages/${stageId}/br/groups/${groupId}/lobbies`),
    enabled: enabled && !!stageId && !!groupId,
    staleTime: 1000 * 60,
    refetchInterval: enabled && !!stageId && !!groupId ? effectiveInterval : false,
    refetchIntervalInBackground: Boolean(effectiveInterval),
  });

  const rounds = data ?? [];
  const normalizedRounds = rounds.map((round) => ({
    ...round,
    round_number: round.round_number ?? round.wave_number,
  }));
  const completed = normalizedRounds.filter((r) => r.status === 'completed').length;
  const activeRound = selectPreferredActiveRound(normalizedRounds);
  const totalGames = normalizedRounds.reduce((sum, lobby) => sum + (lobby.game_count ?? 1), 0);
  const completedGames = normalizedRounds.reduce(
    (sum, lobby) => sum + (
      lobby.games_completed
      ?? (lobby.status === 'completed' ? (lobby.game_count ?? 1) : 0)
    ),
    0,
  );

  return {
    rounds: normalizedRounds,
    totalRounds: normalizedRounds.length,
    completedRounds: completed,
    totalGames,
    completedGames,
    activeRound,
    isLoading,
    error,
  };
};

// ── Player context ────────────────────────────────────────────────────────────

export interface BRPlayerGameSchedule {
  id: string;
  gameNumber: number;
  map: string | null;
  status: string;
  scheduledAt: string | null;
}

export interface BRPlayerLobbySchedule {
  lobbyId: string;
  waveNumber: number;
  matchupLabel: string | null;
  status: string;
  scheduledAt: string | null;
  games: BRPlayerGameSchedule[];
}

export interface BRPlayerContext {
  stageId: string | null;
  stageName: string | null;
  groupId: string | null;
  groupName: string | null;
  gamesPerLobby?: number;
  totalRounds: number;
  completedRounds: number;
  totalGames?: number;
  completedGames?: number;
  activeRound: {
    id?: string;
    lobbyId?: string;
    waveNumber?: number;
    roundNumber?: number;
    matchupLabel?: string | null;
    lobbyCode: string | null;
    status: string;
    queueTimerMinutes: number | null;
    queueStartedAt: string | null;
    scheduledAt: string | null;
    map?: string | null;
  } | null;
  activeGame?: {
    id: string;
    lobbyId: string;
    gameNumber: number;
    map: string | null;
    status: string;
    scheduledAt: string | null;
  } | null;
  lobbies?: BRPlayerLobbySchedule[];
}

export const useBRPlayerContext = (
  tournamentId: string | null | undefined,
  enabled = true,
  options?: { realtimeConnected?: boolean },
) => {
  const realtimeConnected = options?.realtimeConnected ?? false;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['br-player-context', tournamentId],
    queryFn: () =>
      apiClient.get<BRPlayerContext>(`/api/tournaments/${tournamentId}/br/player-context`),
    enabled: enabled && !!tournamentId,
    staleTime: 1000 * 5,
    refetchInterval: enabled && !!tournamentId && !realtimeConnected ? 60_000 : false,
    refetchIntervalInBackground: !realtimeConnected,
  });

  const defaultContext: BRPlayerContext = {
    stageId: null,
    groupId: null,
    groupName: null,
    stageName: null,
    totalRounds: 0,
    completedRounds: 0,
    activeRound: null,
  };

  return {
    context: data ?? defaultContext,
    isLoading,
    error,
    refetch,
    isInGroup: !!data?.groupId,
  };
};

