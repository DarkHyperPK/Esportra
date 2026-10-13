import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export interface BroadcastActivityItem {
  id: string;
  eventType: string;
  source: string;
  createdAt: string;
  nodeName: string | null;
}
interface ActivityCursor {
  beforeAt: string;
  beforeId: string;
}
export interface BroadcastActivityPage {
  items: BroadcastActivityItem[];
  nextCursor: ActivityCursor | null;
}
export function useBroadcastActivity(showId: string) {
  return useInfiniteQuery({
    queryKey: ["broadcast-activity", showId],
    enabled: !!showId,
    initialPageParam: null as ActivityCursor | null,
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams({ limit: "50" });
      if (pageParam) {
        query.set("beforeAt", pageParam.beforeAt);
        query.set("beforeId", pageParam.beforeId);
      }
      return apiClient.get<BroadcastActivityPage>(
        `/api/broadcast/shows/${showId}/activity?${query}`,
      );
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 5000,
  });
}
