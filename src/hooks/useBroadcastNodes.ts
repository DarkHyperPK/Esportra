import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { BroadcastNode } from '@/types/broadcast';

export const broadcastNodesQueryKey = (orgId: string) =>
  ['broadcast-nodes', orgId] as const;

export function useBroadcastNodes(orgId: string | null | undefined) {
  return useQuery({
    queryKey: broadcastNodesQueryKey(orgId ?? ''),
    queryFn: () =>
      apiClient.get<BroadcastNode[]>(`/api/broadcast/nodes?orgId=${orgId}`),
    enabled: !!orgId,
    // Nodes send heartbeats every 2s — poll every 10s to surface health changes.
    refetchInterval: 10_000,
    staleTime: 8_000,
  });
}

type NodeCommand = 'hold' | 'take';

export function useSendNodeCommand() {
  return useMutation({
    mutationFn: ({ nodeId, command }: { nodeId: string; command: NodeCommand }) =>
      apiClient.post<{ success: true }>(
        `/api/broadcast/nodes/${nodeId}/command`,
        { command },
      ),
  });
}
