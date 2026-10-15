import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/apiClient";
import { SCREEN_CATALOG } from "@/services/broadcast/screenCatalog";
import { segmentsQueryKey } from "./useBroadcastShowSegments";
const importSchema = z.object({
  matchId: z.string().uuid(),
  screens: z
    .array(
      z.object({
        overlay: z
          .string()
          .refine((value) =>
            SCREEN_CATALOG.some((screen) => screen.overlay === value),
          ),
        title: z.string().trim().min(1).max(120),
      }),
    )
    .min(1)
    .max(45),
});
export function useImportBroadcastScreens(showId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: z.infer<typeof importSchema>) =>
      apiClient.post(
        `/api/broadcast/shows/${showId}/screens/import`,
        importSchema.parse(input),
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: segmentsQueryKey(showId) });
      void client.invalidateQueries({
        queryKey: ["broadcast-configuration", showId],
      });
    },
  });
}
