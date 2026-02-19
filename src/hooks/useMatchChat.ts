import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface MatchMessage {
    id: string;
    match_id: string;
    sender_id: string;
    sender_name: string | null;
    team_id: string | null;
    content: string;
    message_type: 'text' | 'system' | 'time_proposal';
    metadata: any;
    created_at: string;
}

export const useMatchChat = (matchId: string | undefined) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user, profile } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch messages
    const { data: messages, isLoading } = useQuery({
        queryKey: ['match-messages', matchId],
        queryFn: async () => {
            if (!matchId) return [];
            const { data, error } = await supabase
                .from('match_messages')
                .select('*')
                .eq('match_id', matchId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data as MatchMessage[];
        },
        enabled: !!matchId,
    });

    // Send message
    const sendMessage = useMutation({
        mutationFn: async ({ content, teamId, messageType = 'text', metadata = null }: {
            content: string;
            teamId?: string;
            messageType?: 'text' | 'system' | 'time_proposal';
            metadata?: any;
        }) => {
            if (!matchId || !user) throw new Error('Missing required data');

            const { error } = await supabase
                .from('match_messages')
                .insert({
                    match_id: matchId,
                    sender_id: user.id,
                    sender_name: profile?.username || profile?.full_name || 'Anonymous',
                    team_id: teamId || null,
                    content,
                    message_type: messageType,
                    metadata,
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['match-messages', matchId] });
        },
        onError: (error: any) => {
            toast({ title: 'Failed to send', description: error.message, variant: 'destructive' });
        },
    });

    // Send system message (for automated notifications)
    const sendSystemMessage = async (content: string, metadata?: any) => {
        if (!matchId) return;

        try {
            // Use service role or system user for system messages
            const { error } = await supabase
                .from('match_messages')
                .insert({
                    match_id: matchId,
                    sender_id: user?.id || '00000000-0000-0000-0000-000000000000',
                    sender_name: 'System',
                    content,
                    message_type: 'system',
                    metadata,
                });
            if (error) console.error('System message error:', error);
        } catch (error) {
            console.error('Failed to send system message:', error);
        }
    };

    // Real-time subscription
    useEffect(() => {
        if (!matchId) return;

        const channel = supabase
            .channel(`match-messages-${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'match_messages',
                    filter: `match_id=eq.${matchId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['match-messages', matchId] });
                    // Scroll to bottom on new message
                    setTimeout(() => {
                        scrollRef.current?.scrollTo({
                            top: scrollRef.current.scrollHeight,
                            behavior: 'smooth',
                        });
                    }, 100);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId, queryClient]);

    // Scroll to bottom helper
    const scrollToBottom = () => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
        });
    };

    return {
        messages,
        isLoading,
        sendMessage,
        sendSystemMessage,
        scrollRef,
        scrollToBottom,
    };
};
