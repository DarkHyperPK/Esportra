import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMatchRealtime } from '@/hooks/useMatchRealtime';

interface Dispute {
    id: string;
    match_id: string;
    disputed_by_team_id: string;
    disputed_by_user_id: string;
    reason: string;
    evidence_urls: string[];
    status: 'pending' | 'resolved' | 'rejected';
    resolution: string | null;
    resolved_at: string | null;
    resolved_by: string | null;
    created_at: string;
}

export const useMatchDispute = (matchId: string | undefined) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();

    // Fetch dispute via .NET API
    const { data: dispute, isLoading } = useQuery<Dispute | null>({
        queryKey: ['match-dispute', matchId],
        queryFn: () => apiClient.get<Dispute | null>(`/api/matches/${matchId}/dispute`),
        enabled: !!matchId,
        staleTime: 10_000,
    });

    // Live updates via SignalR MatchHub
    useMatchRealtime({
        matchId,
        enabled: !!matchId,
        onDisputeResolved: () => queryClient.invalidateQueries({ queryKey: ['match-dispute', matchId] }),
    });

    // File a dispute
    const fileDispute = useMutation({
        mutationFn: async ({
            teamId,
            reason,
            evidenceUrls,
        }: {
            teamId: string;
            reason: string;
            evidenceUrls: string[];
        }) => {
            if (!matchId || !user) throw new Error('Missing required data');
            return apiClient.post<Dispute>(`/api/matches/${matchId}/disputes`, {
                teamId,
                reason,
                evidenceUrls,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['match-dispute', matchId] });
            toast({ title: 'Dispute Filed', description: 'The organizer will review your dispute.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to File Dispute', description: error.message, variant: 'destructive' });
        },
    });

    // Resolve dispute (organizer only)
    const resolveDispute = useMutation({
        mutationFn: async ({
            disputeId,
            status,
            resolution,
        }: {
            disputeId: string;
            status: 'resolved' | 'rejected';
            resolution: string;
        }) => {
            if (!user) throw new Error('Not authenticated');
            return apiClient.put(`/api/matches/${matchId}/disputes/${disputeId}/resolve`, {
                status,
                resolution,
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['match-dispute', matchId] });
            toast({
                title: variables.status === 'resolved' ? 'Dispute Resolved' : 'Dispute Rejected',
                description: 'Teams have been notified.',
            });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to Update Dispute', description: error.message, variant: 'destructive' });
        },
    });

    // Upload evidence image to Supabase Storage (Storage stays with Supabase)
    const uploadEvidence = async (file: File): Promise<string> => {
        const fileName = `disputes/${matchId}/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
            .from('match-evidence')
            .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from('match-evidence')
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    };

    return {
        dispute,
        isLoading,
        fileDispute,
        resolveDispute,
        uploadEvidence,
        hasActiveDispute: dispute?.status === 'pending',
    };
};
