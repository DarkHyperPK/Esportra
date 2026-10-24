import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export type ProRequestStatus = 'pending' | 'contacted' | 'closed' | 'proof_submitted';
export interface ProRequestRow {
  id: string; reference: string; eventName: string; gameTitle: string; email: string;
  startsOn: string; endsOn: string; teamCount: number; estimatedAmount: number | null;
  status: ProRequestStatus; createdAt: string;
  hasProof: boolean;
}

export function useProEventRequestQueue(status: ProRequestStatus, page: number, enabled: boolean) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'pro-event-requests', status, page], enabled,
    queryFn: () => apiClient.get<{ items: ProRequestRow[]; hasMore: boolean }>(`/api/admin/pro-event-requests?status=${status}&page=${page}`),
    refetchInterval: 60000 });
  const update = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ProRequestStatus }) => apiClient.put<void>(`/api/admin/pro-event-requests/${id}/status`, { status: next }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'pro-event-requests'] }),
  });
  return { ...query, update };
}
