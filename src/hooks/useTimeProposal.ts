import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useMatchRealtime } from '@/hooks/useMatchRealtime';

interface TimeProposal {
    id: string;
    match_id: string;
    proposed_by: string;
    proposed_time: string;
    status: 'pending' | 'accepted' | 'rejected' | 'countered';
    created_at: string;
    responded_at: string | null;
}

export const useTimeProposal = (
    matchId: string | undefined,
    options?: { subscribeRealtime?: boolean },
) => {
    const subscribeRealtime = options?.subscribeRealtime !== false;
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();

    // Fetch proposals via .NET API
    const { data: proposals, isLoading } = useQuery<TimeProposal[]>({
        queryKey: ['match-time-proposals', matchId],
        queryFn: () => apiClient.get<TimeProposal[]>(`/api/matches/${matchId}/time-proposals`),
        enabled: !!matchId,
        staleTime: 10_000,
    });

    const activeProposal = proposals?.find(p => p.status === 'pending') ?? null;
    const acceptedProposal = proposals?.find(p => p.status === 'accepted') ?? null;

    // Live updates via SignalR MatchHub (skip when parent owns MatchHub subscription)
    useMatchRealtime({
        matchId,
        enabled: subscribeRealtime && !!matchId,
        onTimeProposalUpdated: () => {
            void queryClient.invalidateQueries({ queryKey: ['match-time-proposals', matchId] });
            void queryClient.invalidateQueries({ queryKey: ['match-room-state', matchId] });
        },
        onStatusChanged: () => {
            void queryClient.invalidateQueries({ queryKey: ['match-time-proposals', matchId] });
        },
    });

    // Propose a time
    const proposeTime = useMutation({
        mutationFn: async (proposedTime: Date) => {
            if (!matchId || !user) throw new Error('Missing required data');
            return apiClient.post(`/api/matches/${matchId}/time-proposals`, {
                proposedTime: proposedTime.toISOString(),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['match-time-proposals', matchId] });
            toast({ title: 'Time Proposed', description: 'Waiting for opponent to accept.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Accept a proposal
    const acceptProposal = useMutation({
        mutationFn: async (proposalId: string) => {
            if (!matchId) throw new Error('Match ID required');
            return apiClient.post(`/api/matches/${matchId}/time-proposals/${proposalId}/accept`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['match-time-proposals', matchId] });
            queryClient.invalidateQueries({ queryKey: ['match-room-state', matchId] });
            toast({ title: 'Time Accepted!', description: 'Match time has been scheduled.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Reject a proposal
    const rejectProposal = useMutation({
        mutationFn: async (proposalId: string) => {
            if (!matchId) throw new Error('Match ID required');
            return apiClient.post(`/api/matches/${matchId}/time-proposals/${proposalId}/reject`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['match-time-proposals', matchId] });
            toast({ title: 'Proposal Rejected' });
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Counter proposal (reject current and propose new)
    const counterProposal = useMutation({
        mutationFn: async ({ proposalId, newTime }: { proposalId: string; newTime: Date }) => {
            if (!matchId || !user) throw new Error('Missing required data');
            return apiClient.post(`/api/matches/${matchId}/time-proposals/${proposalId}/counter`, {
                proposedTime: newTime.toISOString(),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['match-time-proposals', matchId] });
            toast({ title: 'Counter Proposal Sent' });
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    return {
        proposals,
        activeProposal,
        acceptedProposal,
        isLoading,
        proposeTime,
        acceptProposal,
        rejectProposal,
        counterProposal,
    };
};
