import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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

    // Fetch dispute for this match
    const { data: dispute, isLoading } = useQuery({
        queryKey: ['match-dispute', matchId],
        queryFn: async () => {
            if (!matchId) return null;
            const { data, error } = await supabase
                .from('match_disputes')
                .select('*')
                .eq('match_id', matchId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error && error.code !== 'PGRST116') throw error;
            return data as Dispute | null;
        },
        enabled: !!matchId,
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

            const { data, error } = await supabase
                .from('match_disputes')
                .insert({
                    match_id: matchId,
                    disputed_by_team_id: teamId,
                    disputed_by_user_id: user.id,
                    reason,
                    evidence_urls: evidenceUrls,
                    status: 'pending',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['match-dispute', matchId] });
            toast({ title: 'Dispute Filed', description: 'The organizer will review your dispute.' });
        },
        onError: (error: any) => {
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

            const { error } = await supabase
                .from('match_disputes')
                .update({
                    status,
                    resolution,
                    resolved_at: new Date().toISOString(),
                    resolved_by: user.id,
                })
                .eq('id', disputeId);

            if (error) throw error;

            // Send notifications to both parties after resolution
            if (dispute) {
                const notifType = status === 'resolved' ? 'dispute_resolved' : 'dispute_rejected';
                const notifTitle = status === 'resolved' ? 'Dispute Resolved' : 'Dispute Rejected';
                const notifMessage = status === 'resolved'
                    ? `Your match dispute has been resolved. Organizer note: ${resolution}`
                    : `Your match dispute was rejected. Organizer note: ${resolution}`;

                // Notify the disputing captain
                await supabase.from('notifications').insert({
                    user_id: dispute.disputed_by_user_id,
                    type: notifType,
                    title: notifTitle,
                    message: notifMessage,
                    link: '/tournaments/captain',
                    data: { match_id: dispute.match_id },
                    is_read: false,
                });

                // Notify the original reporter (look up via match_result_reports)
                const { data: reportRow } = await supabase
                    .from('match_result_reports')
                    .select('reported_by')
                    .eq('match_id', dispute.match_id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (reportRow?.reported_by && reportRow.reported_by !== dispute.disputed_by_user_id) {
                    await supabase.from('notifications').insert({
                        user_id: reportRow.reported_by,
                        type: notifType,
                        title: notifTitle,
                        message: notifMessage,
                        link: '/tournaments/captain',
                        data: { match_id: dispute.match_id },
                        is_read: false,
                    });
                }
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['match-dispute', matchId] });
            toast({
                title: variables.status === 'resolved' ? 'Dispute Resolved' : 'Dispute Rejected',
                description: 'Teams have been notified.',
            });
        },
        onError: (error: any) => {
            toast({ title: 'Failed to Update Dispute', description: error.message, variant: 'destructive' });
        },
    });

    // Upload evidence image to storage
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
