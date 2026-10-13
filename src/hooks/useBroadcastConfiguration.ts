import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/apiClient";

const configurationSchema = z.object({
  showId: z.string().uuid(),
  title: z.string(),
  eventLabel: z.string().nullable().optional(),
  game: z.string().nullable().optional(),
  matches: z.array(
    z.object({
      matchId: z.string().uuid(),
      matchCode: z.string(),
      bestOf: z.number(),
      teams: z
        .array(z.object({ name: z.string() }))
        .nullable()
        .optional(),
      veto: z
        .array(z.object({ action: z.string(), map: z.string() }))
        .nullable()
        .optional(),
    }),
  ),
  rundown: z
    .array(z.object({ id: z.string(), title: z.string(), type: z.string() }))
    .nullable()
    .optional(),
});
export function useBroadcastConfiguration(showId: string) {
  return useQuery({
    queryKey: ["broadcast-configuration", showId],
    queryFn: async () =>
      configurationSchema.parse(
        await apiClient.get<unknown>(
          `/api/broadcast/shows/${showId}/configuration`,
        ),
      ),
    enabled: !!showId,
    staleTime: 5000,
  });
}
