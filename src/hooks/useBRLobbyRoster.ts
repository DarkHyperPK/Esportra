import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { BRGroupTeam } from '@/types/brGroups';

/** Merged roster for a physical lobby that spans multiple seed groups (rotation). */
export function useBRLobbyRoster(stageId: string | null, groupIds: string[]) {
  const uniqueIds = [...new Set(groupIds.filter(Boolean))];

  const queries = useQueries({
    queries: uniqueIds.map((groupId) => ({
      queryKey: ['br-group-teams', stageId, groupId],
      queryFn: () =>
        apiClient.get<BRGroupTeam[]>(`/api/stages/${stageId}/br/groups/${groupId}/teams`),
      enabled: Boolean(stageId && groupId),
      staleTime: 1000 * 60 * 2,
    })),
  });

  const teams = queries.flatMap((q) => q.data ?? []);
  const isLoading = queries.some((q) => q.isLoading);
  const error = queries.find((q) => q.error)?.error ?? null;

  const dedupedTeams = (() => {
    const seen = new Set<string>();
    return teams.filter((t) => {
      const key = t.team_id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  return { teams: dedupedTeams, isLoading, error };
}
