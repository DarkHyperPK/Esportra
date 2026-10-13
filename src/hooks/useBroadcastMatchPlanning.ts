import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/apiClient";
import { broadcastShowQueryKey } from "./useBroadcastShow";

export function useAvailableBroadcastMatches(showId: string) {
  return useQuery({
    queryKey: ["broadcast-available-matches", showId],
    enabled: !!showId,
    queryFn: () =>
      apiClient.get<{ id: string; teamA: string; teamB: string }[]>(
        `/api/broadcast/shows/${showId}/available-matches`,
      ),
  });
}
export function useUpdateBroadcastMatchCode(showId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchId,
      matchCode,
    }: {
      matchId: string;
      matchCode: string;
    }) =>
      apiClient.patch(
        `/api/broadcast/shows/${showId}/matches/${z.string().uuid().parse(matchId)}`,
        {
          matchCode: z
            .string()
            .regex(/^[A-Za-z0-9_-]{1,20}$/)
            .parse(matchCode)
            .toUpperCase(),
        },
      ),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: broadcastShowQueryKey(showId),
      });
    },
  });
}
