import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

/** The room's chat: an inbox group conversation with both teams' captains and managers. */
export function useScrimConversation(sessionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['scrims', 'conversation', sessionId ?? ''],
    enabled: enabled && !!sessionId,
    staleTime: Infinity,
    retry: 1,
    queryFn: async () => {
      const res = await apiClient.post<{ conversation_id: string }>(`/api/scrims/sessions/${sessionId}/conversation`, {});
      return res.conversation_id;
    },
  });
}
