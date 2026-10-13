import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/apiClient";
export interface BroadcastTalent {
  id: string;
  name: string;
  handle: string | null;
  role: "caster" | "analyst" | "host";
  displayOrder: number;
}
const schema = z.object({
  name: z.string().trim().min(1).max(100),
  handle: z.string().max(100).optional(),
  role: z.enum(["caster", "analyst", "host"]),
});
export function useBroadcastTalent(showId: string) {
  return useQuery({
    queryKey: ["broadcast-talent", showId],
    queryFn: () =>
      apiClient.get<BroadcastTalent[]>(`/api/broadcast/shows/${showId}/talent`),
    enabled: !!showId,
  });
}
export function useEditBroadcastTalent(showId: string) {
  const client = useQueryClient();
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ["broadcast-talent", showId] });
    void client.invalidateQueries({ queryKey: ["broadcast-show", showId] });
  };
  const add = useMutation({
    mutationFn: (input: z.input<typeof schema>) =>
      apiClient.post(
        `/api/broadcast/shows/${showId}/talent`,
        schema.parse(input),
      ),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/api/broadcast/shows/${showId}/talent/${id}`),
    onSuccess: invalidate,
  });
  return { add, remove };
}
