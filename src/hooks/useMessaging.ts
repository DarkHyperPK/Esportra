import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';
import { HubPaths } from '@/lib/signalrClient';
import { useHub } from '@/hooks/useSignalR';
import type { Conversation, ConversationMessage, SendMessageRequest } from '@/types/messaging';

const messagingKeys = {
  all: () => ['conversations'] as const,
  list: () => [...messagingKeys.all(), 'list'] as const,
  messages: (id: string) => ['conversations', id, 'messages'] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: messagingKeys.list(),
    queryFn: () => apiClient.get<Conversation[]>('/api/conversations'),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useConversationMessages(conversationId: string) {
  return useQuery({
    queryKey: messagingKeys.messages(conversationId),
    queryFn: () =>
      apiClient.get<ConversationMessage[]>(`/api/conversations/${conversationId}/messages`),
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
    mutationFn: () =>
      apiClient.put(`/api/conversations/${conversationId}/read`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: messagingKeys.list() });
    },
  });
}

/** Subscribe to real-time messages for an open conversation thread. */
export function useConversationRealtime(
  conversationId: string,
  onMessage: (msg: ConversationMessage) => void,
) {
  const conn = useHub(HubPaths.Conversation, { autoStart: true });
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    if (!conversationId || !conn) return;

    const handler = (msg: ConversationMessage) => callbackRef.current(msg);
    conn.invoke('JoinConversation', conversationId).catch(console.error);
    conn.on('MessageReceived', handler);

    return () => {
      conn.off('MessageReceived', handler);
      conn.invoke('LeaveConversation', conversationId).catch(() => {});
    };
  }, [conversationId, conn]);
}
