import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { ResolvedPlacement } from '@/types/prizeDistribution';

export function useTournamentPlacements(tournamentId?: string) {
    return useQuery({
        queryKey: ['tournament-placements', tournamentId],
        queryFn: () => apiClient.get<ResolvedPlacement[]>(`/api/tournaments/${tournamentId}/placements`),
        enabled: !!tournamentId,
        staleTime: 60_000,
    });
}

export function useResolvePlacements() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tournamentId, force = false }: { tournamentId: string; force?: boolean }) =>
            apiClient.post<ResolvedPlacement[]>(
                `/api/tournaments/${tournamentId}/placements/resolve${force ? '?force=true' : ''}`,
                {},
            ),
        onSuccess: (_data, { tournamentId }) => {
            queryClient.invalidateQueries({ queryKey: ['tournament-placements', tournamentId] });
            queryClient.invalidateQueries({ queryKey: ['tournament-payouts', tournamentId] });
        },
    });
}
