import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';
import { HubPaths } from '@/lib/signalrClient';
import { useHub } from '@/hooks/useSignalR';
import type { ConversationMessage, SendMessageRequest } from '@/types/messaging';
import { normalizeConversation, normalizeMessage } from '@/lib/messagingNormalization';

export const messagingKeys = {
  all: () => ['conversations'] as const,
  list: () => [...messagingKeys.all(), 'list'] as const,
  messages: (id: string) => ['conversations', id, 'messages'] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: messagingKeys.list(),
    queryFn: async () => (await apiClient.get<unknown[]>('/api/conversations')).map(normalizeConversation),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useConversationMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: messagingKeys.messages(conversationId),
    queryFn: async ({ pageParam }) => (await apiClient.get<unknown[]>(`/api/conversations/${conversationId}/messages?limit=50&offset=${pageParam}`)).map(normalizeMessage),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => last.length === 50 ? pages.length * 50 : undefined,
    enabled: !!conversationId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: SendMessageRequest) =>
      apiClient.post<ConversationMessage>(
        `/api/conversations/${conversationId}/messages`,
        req,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: messagingKeys.messages(conversationId) });
      void qc.invalidateQueries({ queryKey: messagingKeys.list() });
    },
  });
}

export function useMarkRead(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (through?: string) =>
      apiClient.put(`/api/conversations/${conversationId}/read${through ? `?through=${encodeURIComponent(through)}` : ''}`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: messagingKeys.list() });
    },
  });
}

/** Subscribe to real-time messages for an open conversation thread. */
export function useConversationRealtime(
  conversationId: string,
  onMessage: (msg: ConversationMessage) => void,
  enabled = true,
) {
  const conn = useHub(HubPaths.Conversation, { autoStart: true });
  const qc = useQueryClient();
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    if (!conn || !enabled) return;

    const handler = (payload: ConversationMessage) => {
      const msg = normalizeMessage(payload);
      void qc.invalidateQueries({ queryKey: messagingKeys.list() });
      if (msg.conversationId === conversationId) callbackRef.current(msg);
    };
    const onMutation = () => {
      void qc.invalidateQueries({ queryKey: messagingKeys.list() });
      if (conversationId) void qc.invalidateQueries({ queryKey: messagingKeys.messages(conversationId) });
    };
    const onRead = () => { void qc.invalidateQueries({ queryKey: messagingKeys.list() }); };
    conn.on('MessagesRead', onRead);
    conn.on('MessageReceived', handler);
    conn.on('MessageEdited', onMutation);
    conn.on('MessageDeleted', onMutation);
    if (conversationId) conn.invoke('JoinConversation', conversationId).catch(() => {});

    return () => {
      conn.off('MessagesRead', onRead);
      conn.off('MessageReceived', handler);
      conn.off('MessageEdited', onMutation);
      conn.off('MessageDeleted', onMutation);
      if (conversationId) conn.invoke('LeaveConversation', conversationId).catch(() => {});
    };
  }, [conversationId, conn, qc, enabled]);
}
