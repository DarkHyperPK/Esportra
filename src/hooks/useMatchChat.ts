/**
 * useMatchChat — match chat via SignalR ChatHub.
 * - Initial messages: GET /api/matches/{id}/messages (.NET)
 * - Real-time: SignalR ChatHub MessageReceived → cache append (no refetch)
 * - sendMessage: SignalR hub invocation (hub persists to DB + broadcasts)
 * - sendSystemMessage: POST /api/matches/{id}/messages/system (.NET, broadcasts via ChatHub)
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HubConnectionState } from '@microsoft/signalr';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';

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

// Map SignalR MessageDto (camelCase) → MatchMessage (snake_case)
function fromDto(dto: Record<string, any>): MatchMessage {
  return {
    id:           dto.id,
    match_id:     dto.matchId,
    sender_id:    dto.userId,
    sender_name:  dto.username ?? null,
    team_id:      null,
    content:      dto.content,
    message_type: 'text',
    metadata:     null,
    created_at:   dto.createdAt,
  };
}

export const useMatchChat = (matchId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const { user }    = useAuth();
  const scrollRef   = useRef<HTMLDivElement>(null);
  const conn        = useHub(HubPaths.Chat);

  // ── Initial fetch (.NET API) ─────────────────────────────────────────────────
  const { data: messages, isLoading } = useQuery<MatchMessage[]>({
    queryKey: ['match-messages', matchId],
    queryFn:  () => apiClient.get<MatchMessage[]>(`/api/matches/${matchId}/messages`),
    enabled:  !!matchId,
    staleTime: 30_000,
  });

  // ── SignalR real-time subscription ───────────────────────────────────────────
  useEffect(() => {
    if (!matchId) return;

    let active = true;

    const handleMessageReceived = (dto: Record<string, any>) => {
      if (!active) return;
      const msg = fromDto(dto);

      queryClient.setQueryData<MatchMessage[]>(
        ['match-messages', matchId],
        (old = []) => {
          if (old.some((m) => m.id === msg.id)) return old; // deduplicate
          const next = [...old, msg];
          // Scroll to bottom after append
          setTimeout(() => scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
          }), 80);
          return next;
        },
      );
    };

    conn.on('MessageReceived', handleMessageReceived);

    const join = () => {
      if (!active || conn.state !== HubConnectionState.Connected) return;
      conn.invoke('JoinChat', matchId).catch(console.warn);
    };
    join();
    conn.onreconnected(join);

    return () => {
      active = false;
      conn.off('MessageReceived', handleMessageReceived);
      if (conn.state === HubConnectionState.Connected)
        conn.invoke('LeaveChat', matchId).catch(() => {});
    };
  }, [conn, matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send message via hub ─────────────────────────────────────────────────────
  // Hub persists to DB and broadcasts to all in chat:{matchId} — including sender
  const sendMessage = useMutation({
    mutationFn: async ({ content }: { content: string; teamId?: string; messageType?: string; metadata?: any }) => {
      if (!matchId || !user) throw new Error('Missing required data');
      if (conn.state !== HubConnectionState.Connected)
        throw new Error('Chat not connected. Please wait a moment and try again.');
      await conn.invoke('SendMessage', matchId, content.trim());
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to send', description: error.message, variant: 'destructive' });
    },
  });

  // ── System message (.NET API — server inserts + broadcasts via ChatHub) ──────
  const sendSystemMessage = useCallback(async (content: string, metadata?: any) => {
    if (!matchId) return;
    try {
      await apiClient.post(`/api/matches/${matchId}/messages/system`, { content, metadata });
      // ChatHub broadcasts MessageReceived to all in chat — cache update happens via SignalR
    } catch (err) {
      console.error('System message error:', err);
    }
  }, [matchId]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  return { messages, isLoading, sendMessage, sendSystemMessage, scrollRef, scrollToBottom };
};
