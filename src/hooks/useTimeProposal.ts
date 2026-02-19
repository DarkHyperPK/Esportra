import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface TimeProposal {
    id: string;
    match_id: string;
    proposed_by: string;
    proposed_time: string;
    status: 'pending' | 'accepted' | 'rejected' | 'countered';
    created_at: string;
    responded_at: string | null;
}

export const useTimeProposal = (matchId: string | undefined) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();

    // Fetch proposals for this match
    const { data: proposals, isLoading } = useQuery({
        queryKey: ['match-time-proposals', matchId],
        queryFn: async () => {
            if (!matchId) return [];
            const { data, error } = await supabase
                .from('match_time_proposals')
                .select('*')
                .eq('match_id', matchId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as TimeProposal[];
        },
        enabled: !!matchId,
    });

    // Get the latest active proposal
    const activeProposal = proposals?.find(p => p.status === 'pending') ?? null;
    const acceptedProposal = proposals?.find(p => p.status === 'accepted') ?? null;

    // Propose a time
    const proposeTime = useMutation({
        mutationFn: async (proposedTime: Date) => {
            if (!matchId || !user) throw new Error('Missing required data');

            const { error } = await supabase
                .from('match_time_proposals')
                .insert({
                    match_id: matchId,
                    proposed_by: user.id,
                    proposed_time: proposedTime.toISOString(),
                    status: 'pending',
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['match-time-proposals', matchId] });
            toast({ title: 'Time Proposed', description: 'Waiting for opponent to accept.' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Accept a proposal
    const acceptProposal = useMutation({
        mutationFn: async (proposalId: string) => {
            if (!matchId) throw new Error('Match ID required');

            // Get the proposal to get the time
            const proposal = proposals?.find(p => p.id === proposalId);
            if (!proposal) throw new Error('Proposal not found');

            // Update proposal status
            const { error: proposalError } = await supabase
                .from('match_time_proposals')
                .update({ status: 'accepted', responded_at: new Date().toISOString() })
                .eq('id', proposalId);
            if (proposalError) throw proposalError;

            // Update match scheduled_time
            const { error: matchError } = await supabase
                .from('brkt_matches')
                .update({ scheduled_time: proposal.proposed_time })
                .eq('id', matchId);
            if (matchError) throw matchError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['match-time-proposals', matchId] });
            toast({ title: 'Time Accepted!', description: 'Match time has been scheduled.' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Reject a proposal
    const rejectProposal = useMutation({
        mutationFn: async (proposalId: string) => {
            const { error } = await supabase
                .from('match_time_proposals')
                .update({ status: 'rejected', responded_at: new Date().toISOString() })
                .eq('id', proposalId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['match-time-proposals', matchId] });
            toast({ title: 'Proposal Rejected' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Counter proposal (reject current and propose new)
    const counterProposal = useMutation({
        mutationFn: async ({ proposalId, newTime }: { proposalId: string; newTime: Date }) => {
            if (!matchId || !user) throw new Error('Missing required data');

            // Reject the current proposal
            const { error: rejectError } = await supabase
                .from('match_time_proposals')
                .update({ status: 'countered', responded_at: new Date().toISOString() })
                .eq('id', proposalId);
            if (rejectError) throw rejectError;

            // Create new proposal
            const { error: proposeError } = await supabase
                .from('match_time_proposals')
                .insert({
                    match_id: matchId,
                    proposed_by: user.id,
                    proposed_time: newTime.toISOString(),
                    status: 'pending',
                });
            if (proposeError) throw proposeError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['match-time-proposals', matchId] });
            toast({ title: 'Counter Proposal Sent' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Real-time subscription
    useEffect(() => {
        if (!matchId) return;

        const channel = supabase
            .channel(`match-proposals-${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'match_time_proposals',
                    filter: `match_id=eq.${matchId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['match-time-proposals', matchId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId, queryClient]);

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
