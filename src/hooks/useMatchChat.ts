import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HubConnectionState } from '@microsoft/signalr';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useHub } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';

export interface MatchMessage {
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

export type ChatConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface MessagesQueryData {
  messages: MatchMessage[];
  opponentLastReadAt: Date | null;
}

function fromDto(dto: Record<string, any>): MatchMessage {
  return {
    id:           dto.id,
    match_id:     dto.matchId ?? dto.match_id,
    sender_id:    dto.senderId ?? dto.sender_id,
    sender_name:  dto.senderName ?? dto.sender_name ?? null,
    team_id:      dto.teamId ?? dto.team_id ?? null,
    content:      dto.content,
    message_type: dto.messageType ?? dto.message_type ?? 'text',
    metadata:     dto.metadata ?? null,
    created_at:   dto.createdAt ?? dto.created_at,
    is_organizer: dto.isOrganizer ?? dto.is_organizer ?? false,
  };
}

function normalizeMessages(rows: unknown): MatchMessage[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => fromDto(row as Record<string, any>));
}

interface UseMatchChatOptions {
  onNewMessage?: () => void;
  isChatOpen?: boolean;
}

export const useMatchChat = (matchId: string | undefined, options: UseMatchChatOptions = {}) => {
  const onNewMessageRef = useRef(options.onNewMessage);
  useEffect(() => { onNewMessageRef.current = options.onNewMessage; }, [options.onNewMessage]);
  const isChatOpenRef = useRef(options.isChatOpen ?? false);
  useEffect(() => { isChatOpenRef.current = options.isChatOpen ?? false; }, [options.isChatOpen]);

  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const { user }    = useAuth();
  const scrollRef   = useRef<HTMLDivElement>(null);
  const conn        = useHub(HubPaths.Chat);
  const [connectionStatus, setConnectionStatus] = useState<ChatConnectionStatus>('connecting');
  const [isJoined, setIsJoined] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [opponentLastReadAt, setOpponentLastReadAt] = useState<Date | null>(null);

  const messagesQueryKey = ['match-messages', matchId, user?.id ?? 'anonymous'] as const;

  const { data: chatData, isLoading, isError, error } = useQuery<MessagesQueryData>({
    queryKey: messagesQueryKey,
    queryFn:  async () => {
      const response = await apiClient.get<unknown>(`/api/matches/${matchId}/messages`);
      const msgs = Array.isArray(response) ? response : (response as { messages: unknown[] }).messages;
      const receipts = Array.isArray(response)
        ? []
        : ((response as { readReceipts?: { userId: string; lastReadAt: string }[] }).readReceipts ?? []);
      const opponentReceipt = receipts.find((r) => r.userId !== user?.id);
      return {
        messages: normalizeMessages(msgs),
        opponentLastReadAt: opponentReceipt ? new Date(opponentReceipt.lastReadAt) : null,
      };
    },
    enabled:  !!matchId && !!user?.id,
    staleTime: 30_000,
    retry: false,
  });

  const messages = chatData?.messages;

  useEffect(() => {
    if (isError) {
      setChatError(getApiErrorMessage(error, 'Unable to load match chat.'));
    } else {
      setChatError(null);
    }
  }, [isError, error]);

  useEffect(() => {
    setOpponentLastReadAt(chatData?.opponentLastReadAt ?? null);
  }, [chatData?.opponentLastReadAt]);

  useEffect(() => {
    if (!matchId || !user?.id) return;

    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let monitorTimer: ReturnType<typeof setInterval> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let joined = false;

    const handleMessageReceived = (dto: Record<string, any>) => {
      if (!active) return;
      const msg = fromDto(dto);

      queryClient.setQueryData<MessagesQueryData>(
        messagesQueryKey,
        (old) => {
          const prev = old ?? { messages: [], opponentLastReadAt: null };
          if (prev.messages.some((m) => m.id === msg.id)) return prev;
          const next = [...prev.messages, msg];
          setTimeout(() => scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
          }), 80);
          return { ...prev, messages: next };
        },
      );

      if (msg.sender_id !== user.id) {
        onNewMessageRef.current?.();
        if (joined && isChatOpenRef.current) {
          conn.invoke('MarkRead', matchId).catch(() => {});
        }
      }
    };

    const handleMessagesSeen = (payload: { matchId: string; userId: string; lastReadAt: string }) => {
      if (!active) return;
      setOpponentLastReadAt(new Date(payload.lastReadAt));
    };

    const handleHubError = (message: string) => {
      if (!active) return;
      setChatError(message || 'Unable to join match chat.');
      joined = false;
      setIsJoined(false);
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
          if (active) {
            setChatError('Chat connection failed. Retrying...');
            scheduleJoin(1500);
          }
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
        setChatError(null);
      } catch (err) {
        if (!active) return;
        joined = false;
        setIsJoined(false);
        setChatError(getApiErrorMessage(err, 'Unable to join match chat.'));
        scheduleJoin(1500);
      }
    };

    conn.on('MessageReceived', handleMessageReceived);
    conn.on('MessagesSeen', handleMessagesSeen);
    conn.on('Error', handleHubError);
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

    // Refresh server-side presence key every 90 s so offline-email detection is accurate.
    // isChatOpen drives the MarkRead upsert on the server — heartbeat alone never marks read.
    heartbeatTimer = setInterval(() => {
      if (!active || !joined || conn.state !== HubConnectionState.Connected) return;
      conn.invoke('Heartbeat', matchId, isChatOpenRef.current).catch(() => {});
    }, 90_000);

    return () => {
      active = false;
      clearRetry();
      if (monitorTimer) clearInterval(monitorTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      conn.off('MessageReceived', handleMessageReceived);
      conn.off('MessagesSeen', handleMessagesSeen);
      conn.off('Error', handleHubError);
      if (conn.state === HubConnectionState.Connected)
        conn.invoke('LeaveChat', matchId).catch(() => {});
    };
  }, [conn, matchId, user?.id, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const sendSystemMessage = useCallback(async (content: string, metadata?: any) => {
    if (!matchId) return;
    try {
      await apiClient.post(`/api/matches/${matchId}/messages/system`, { content, metadata });
    } catch (err) {
      console.error('System message error:', err);
    }
  }, [matchId]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  const markRead = useCallback(() => {
    if (!matchId || !isJoined || conn.state !== HubConnectionState.Connected) return;
    conn.invoke('MarkRead', matchId).catch(() => {});
  }, [conn, matchId, isJoined]);

  return {
    messages,
    isLoading,
    isError,
    chatError,
    sendMessage,
    sendSystemMessage,
    scrollRef,
    scrollToBottom,
    connectionStatus,
    isJoined,
    opponentLastReadAt,
    markRead,
  };
};
