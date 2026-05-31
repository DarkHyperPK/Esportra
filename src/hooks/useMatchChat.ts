/**
 * useMatchChat — match chat via SignalR ChatHub.
 * - Initial messages: GET /api/matches/{id}/messages (.NET)
 * - Real-time: SignalR ChatHub MessageReceived → cache append (no refetch)
 * - sendMessage: SignalR hub invocation (hub persists to DB + broadcasts)
 * - sendSystemMessage: POST /api/matches/{id}/messages/system (.NET, broadcasts via ChatHub)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HubConnectionState } from '@microsoft/signalr';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useHub } from '@/hooks/useSignalR';
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
  is_organizer?: boolean;
}

type ChatConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

// Map SignalR MessageDto (camelCase) → MatchMessage (snake_case)
function fromDto(dto: Record<string, any>): MatchMessage {
  return {
    id:           dto.id,
    match_id:     dto.matchId,
    sender_id:    dto.senderId,
    sender_name:  dto.senderName ?? null,
    team_id:      dto.teamId ?? null,
    content:      dto.content,
    message_type: dto.messageType ?? 'text',
    metadata:     dto.metadata ?? null,
    created_at:   dto.createdAt,
    is_organizer: dto.isOrganizer ?? dto.is_organizer ?? false,
  };
}

export const useMatchChat = (matchId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const { user }    = useAuth();
  const scrollRef   = useRef<HTMLDivElement>(null);
  const conn        = useHub(HubPaths.Chat);
  const [connectionStatus, setConnectionStatus] = useState<ChatConnectionStatus>('connecting');
  const [isJoined, setIsJoined] = useState(false);

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
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let monitorTimer: ReturnType<typeof setInterval> | null = null;
    let joined = false;

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

    const syncStatus = () => {
      if (!active) return;
      if (conn.state === HubConnectionState.Connected) setConnectionStatus('connected');
      else if (conn.state === HubConnectionState.Reconnecting) setConnectionStatus('reconnecting');
      else if (conn.state === HubConnectionState.Disconnected) setConnectionStatus('disconnected');
      else setConnectionStatus('connecting');
    };

    const clearRetry = () => {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
    };

    const scheduleJoin = (delayMs = 250) => {
      clearRetry();
      retryTimer = setTimeout(() => void join(), delayMs);
    };

    const join = async () => {
      if (!active) return;
      syncStatus();

      if (conn.state === HubConnectionState.Disconnected) {
        try {
          await conn.start();
        } catch {
          if (active) scheduleJoin(1500);
          return;
        }
      }

      if (conn.state !== HubConnectionState.Connected) {
        scheduleJoin(500);
        return;
      }

      try {
        await conn.invoke('JoinChat', matchId);
        if (!active) return;
        joined = true;
        setConnectionStatus('connected');
        setIsJoined(true);
      } catch {
        if (!active) return;
        joined = false;
        setIsJoined(false);
        scheduleJoin(1500);
      }
    };

    conn.on('MessageReceived', handleMessageReceived);
    join();
    monitorTimer = setInterval(() => {
      if (!active) return;
      syncStatus();
      if (conn.state !== HubConnectionState.Connected && joined) {
        joined = false;
        setIsJoined(false);
      }
      if (conn.state === HubConnectionState.Connected && !joined) {
        void join();
      }
    }, 1000);

    return () => {
      active = false;
      clearRetry();
      if (monitorTimer) clearInterval(monitorTimer);
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
      if (conn.state !== HubConnectionState.Connected || !isJoined)
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

  return { messages, isLoading, sendMessage, sendSystemMessage, scrollRef, scrollToBottom, connectionStatus, isJoined };
};
