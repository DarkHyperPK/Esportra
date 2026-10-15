import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
export interface ProductionTimelineItem { id: string; eventType: string; at: string; nodeName: string | null; nodeId: string | null; actorKind: string; action: string | null; cause: string | null; kind: string | null; status: string | null; segmentName: string | null }
export interface ProductionTimelineData { items: ProductionTimelineItem[]; since: string; until: string; truncated: boolean }
export function useBroadcastTimeline(showId: string) {
  return useQuery({ queryKey: ["broadcast-timeline", showId], queryFn: () => apiClient.get<ProductionTimelineData>(`/api/broadcast/shows/${showId}/timeline`), enabled: !!showId, refetchInterval: 5000, retry: false });
}
