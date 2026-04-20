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

export const useBRGroupStage = (stageId: string | null) => {
  const { data: groups, isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ['br-groups', stageId],
    queryFn: () => apiClient.get<BRGroup[]>(`/api/stages/${stageId}/br/groups`),
    enabled: !!stageId,
    staleTime: 1000 * 60 * 2,
  });

  return {
    groups: groups ?? [],
    isLoading: groupsLoading,
    error: groupsError,
    hasGroups: (groups?.length ?? 0) > 0,
  };
};

export const useBRGroupLeaderboard = (stageId: string | null, groupId: string | null) => {
  const { data, isLoading, error } = useQuery({
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
  };
};

export const useBRGroupRounds = (stageId: string | null, groupId: string | null) => {
  const { data, isLoading } = useQuery({
    queryKey: ['br-group-rounds-summary', stageId, groupId],
    queryFn: () =>
      apiClient.get<BRRound[]>(`/api/stages/${stageId}/br/groups/${groupId}/rounds`),
    enabled: !!stageId && !!groupId,
    staleTime: 1000 * 60,
  });

  const rounds = data ?? [];
  const completed = rounds.filter((r) => r.status === 'completed').length;
  const activeRound = rounds.find((r) => r.status === 'active') ?? null;

  return {
    rounds,
    totalRounds: rounds.length,
    completedRounds: completed,
    activeRound,
    isLoading,
  };
};
