import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { competitiveApiClient as apiClient } from '@/hooks/competitive/competitiveApiClient';
import type { TeamEligibilityStatus, CompetitiveRecord } from '@/types/competitive';

export const integrationKeys = {
  eligibility: (tournamentId: string) =>
    ['competitive', 'eligibility', tournamentId] as const,
  records: (userId: string, game?: string) =>
    ['competitive', 'records', userId, game] as const,
};

export function useTournamentEligibility(tournamentId: string) {
  return useQuery({
    queryKey: integrationKeys.eligibility(tournamentId),
    queryFn: () =>
      apiClient.get<TeamEligibilityStatus[]>(
        `/api/competitive/eligibility/${tournamentId}`,
      ),
    enabled: !!tournamentId,
    staleTime: 30_000,
  });
}

export function useRefreshEligibility(tournamentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<void>(
        `/api/competitive/eligibility/${tournamentId}/refresh`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: integrationKeys.eligibility(tournamentId),
      });
    },
  });
}

export function useCompetitiveRecords(userId: string, game?: string) {
  const params = game ? `?game=${encodeURIComponent(game)}` : '';
  return useQuery({
    queryKey: integrationKeys.records(userId, game),
    queryFn: () =>
      apiClient.get<CompetitiveRecord>(
        `/api/competitive/records/${userId}${params}`,
      ),
    enabled: !!userId,
    staleTime: 30_000,
  });
}
