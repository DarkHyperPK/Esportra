import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { TournamentPayoutsResponse, RewardDistribution } from '@/types/prizeDistribution';

export function useTournamentPayouts(tournamentId?: string) {
    return useQuery({
        queryKey: ['tournament-payouts', tournamentId],
        queryFn: () => apiClient.get<TournamentPayoutsResponse>(`/api/tournaments/${tournamentId}/payouts`),
        enabled: !!tournamentId,
        staleTime: 30_000,
    });
}

export function useUpdatePayout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            tournamentId,
            payoutId,
            status,
            failedReason,
        }: {
            tournamentId: string;
            payoutId: string;
            status: string;
            failedReason?: string;
        }) =>
            apiClient.put(`/api/tournaments/${tournamentId}/payouts/${payoutId}`, {
                status,
                failed_reason: failedReason,
            }),
        onSuccess: (_data, { tournamentId }) => {
            queryClient.invalidateQueries({ queryKey: ['tournament-payouts', tournamentId] });
        },
    });
}

export function useRewardDistributions(tournamentId?: string) {
    return useQuery({
        queryKey: ['reward-distributions', tournamentId],
        queryFn: () => apiClient.get<RewardDistribution[]>(`/api/tournaments/${tournamentId}/reward-distributions`),
        enabled: !!tournamentId,
        staleTime: 30_000,
    });
}

export function useUpdateRewardDistribution() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            tournamentId,
            distributionId,
            status,
            notes,
        }: {
            tournamentId: string;
            distributionId: string;
            status: string;
            notes?: string;
        }) =>
            apiClient.put(`/api/tournaments/${tournamentId}/reward-distributions/${distributionId}`, {
                status,
                notes,
            }),
        onSuccess: (_data, { tournamentId }) => {
            queryClient.invalidateQueries({ queryKey: ['reward-distributions', tournamentId] });
        },
    });
}
