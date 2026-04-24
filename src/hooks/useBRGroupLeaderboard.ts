import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { BRGroup } from '@/types/brGroups';
import type { BRLeaderboardEntry } from '@/types/battleRoyale';
import type { BRRound } from '@/types/brRounds';

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

function mapToLeaderboardEntry(row: GroupLeaderboardResponse): BRLeaderboardEntry {
  return {
    teamId: row.team_id,
    teamName: row.team_name,
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

    return right.round_number - left.round_number;
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

export const useBRGroupLeaderboard = (stageId: string | null, groupId: string | null) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['br-group-leaderboard', stageId, groupId],
    queryFn: async () => {
      const raw = await apiClient.get<GroupLeaderboardResponse[]>(
        `/api/stages/${stageId}/br/groups/${groupId}/leaderboard`
      );
      return raw.map(mapToLeaderboardEntry);
    },
    enabled: !!stageId && !!groupId,
    staleTime: 1000 * 30,
  });

  return {
    leaderboard: data ?? [],
    isLoading,
    error,
    refetch,
  };
};

export const useBRGroupRounds = (stageId: string | null, groupId: string | null, enabled = true) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['br-group-rounds-summary', stageId, groupId],
    queryFn: () =>
      apiClient.get<BRRound[]>(`/api/stages/${stageId}/br/groups/${groupId}/rounds`),
    enabled: enabled && !!stageId && !!groupId,
    staleTime: 1000 * 5,
    refetchInterval: enabled && !!stageId && !!groupId ? 5000 : false,
    refetchIntervalInBackground: true,
  });

  const rounds = data ?? [];
  const completed = rounds.filter((r) => r.status === 'completed').length;
  const activeRound = selectPreferredActiveRound(rounds);

  return {
    rounds,
    totalRounds: rounds.length,
    completedRounds: completed,
    activeRound,
    isLoading,
    error,
  };
};

// ── Player context ────────────────────────────────────────────────────────────

export interface BRPlayerContext {
  stageId: string | null;
  stageName: string | null;
  groupId: string | null;
  groupName: string | null;
  totalRounds: number;
  completedRounds: number;
  activeRound: {
    id: string;
    roundNumber: number;
    lobbyCode: string | null;
    status: string;
    queueTimerMinutes: number | null;
    queueStartedAt: string | null;
    scheduledAt: string | null;
  } | null;
}

export const useBRPlayerContext = (tournamentId: string | null | undefined, enabled = true) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['br-player-context', tournamentId],
    queryFn: () =>
      apiClient.get<BRPlayerContext>(`/api/tournaments/${tournamentId}/br/player-context`),
    enabled: enabled && !!tournamentId,
    staleTime: 1000 * 5,
    refetchInterval: enabled && !!tournamentId ? 5000 : false,
    refetchIntervalInBackground: true,
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

