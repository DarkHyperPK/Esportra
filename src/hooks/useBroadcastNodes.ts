import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/apiClient";
import type { BroadcastNode } from "@/types/broadcast";

export const broadcastNodesQueryKey = (orgId: string) =>
  ["broadcast-nodes", orgId] as const;

export function useBroadcastNodes(orgId: string | null | undefined) {
  return useQuery({
    queryKey: broadcastNodesQueryKey(orgId ?? ""),
    queryFn: () =>
      apiClient.get<BroadcastNode[]>(`/api/broadcast/nodes?orgId=${orgId}`),
    enabled: !!orgId,
    // Nodes send heartbeats every 2s — poll every 10s to surface health changes.
    refetchInterval: 10_000,
    staleTime: 8_000,
  });
}

export function useDeactivateBroadcastNode(orgId: string | null | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) =>
      apiClient.delete(
        `/api/broadcast/nodes/${z.string().uuid().parse(nodeId)}`,
      ),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: broadcastNodesQueryKey(orgId ?? ""),
      });
      void client.invalidateQueries({ queryKey: ["broadcast-home", orgId] });
    },
  });
}
