import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { PrizeDistributionConfig, PrizeDistributionTemplate } from '@/types/prizeDistribution';

export function usePrizeDistribution(tournamentId?: string) {
    return useQuery({
        queryKey: ['prize-distribution', tournamentId],
        queryFn: async () => {
            const res = await apiClient.get<{ distribution: PrizeDistributionConfig | null }>(`/api/tournaments/${tournamentId}/prize-distribution`);
            return res.distribution ?? null;
        },
        enabled: !!tournamentId,
        staleTime: 60_000,
    });
}

export function usePrizeDistributionTemplates(tournamentId?: string) {
    return useQuery({
        queryKey: ['prize-distribution-templates', tournamentId],
        queryFn: () => apiClient.get<PrizeDistributionTemplate[]>(`/api/tournaments/${tournamentId}/prize-distribution/templates`),
        enabled: !!tournamentId,
        staleTime: 300_000,
    });
}

export function useSavePrizeDistribution() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tournamentId, config }: { tournamentId: string; config: PrizeDistributionConfig }) =>
            apiClient.put(`/api/tournaments/${tournamentId}/prize-distribution`, config),
        onSuccess: (_data, { tournamentId }) => {
            queryClient.invalidateQueries({ queryKey: ['prize-distribution', tournamentId] });
        },
    });
}

export function useDeletePrizeDistribution() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (tournamentId: string) =>
            apiClient.delete(`/api/tournaments/${tournamentId}/prize-distribution`),
        onSuccess: (_data, tournamentId) => {
            queryClient.invalidateQueries({ queryKey: ['prize-distribution', tournamentId] });
        },
    });
}
