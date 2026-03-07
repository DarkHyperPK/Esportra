/**
 * useTournamentRegistrationStatus — Domain 4: Batch Registration Check
 *
 * Migrated from manual useState/useEffect + 2 Supabase queries to TanStack Query
 * with a single .NET API call.
 *
 * Old: team_members query + OR-based tournament_participants query per component mount.
 * New: GET /api/tournaments/me/registration-status?ids=id1,id2,id3
 *      → backend does 2 queries max (team IDs + registered IDs), returns { id: bool }.
 *
 * Public return shape { statusMap, loading } is unchanged.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';

export function useTournamentRegistrationStatus(tournamentIds: string[]) {
  const { user } = useAuth();

  const { data: statusMap = {}, isLoading: loading } = useQuery<Record<string, boolean>>({
    queryKey: ['tournament-registration-status', tournamentIds],
    queryFn: () => {
      const ids = tournamentIds.join(',');
      return apiClient.get<Record<string, boolean>>(
        `/api/tournaments/me/registration-status?ids=${encodeURIComponent(ids)}`
      );
    },
    enabled: !!user && tournamentIds.length > 0,
    staleTime: 30_000,
  });

  return { statusMap, loading };
}
