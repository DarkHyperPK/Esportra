import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/apiClient";
import type { BroadcastShowStatus } from "@/types/broadcast";

export interface TournamentBroadcastWorkspace {
  tournament: {
    id: string;
    name: string;
    slug: string;
    game: string;
    organizationId: string | null;
  };
  canManage: boolean;
  access: "ready" | "organization_required" | "organization_owner_required";
  organizations: { id: string; name: string }[];
  shows: {
    id: string;
    title: string;
    status: BroadcastShowStatus;
    scheduledAt: string | null;
    lastSyncedAt: string | null;
    matchCount: number;
  }[];
}
export function useTournamentBroadcast(tournamentId: string) {
  return useQuery({
    queryKey: ["tournament-broadcast", tournamentId],
    queryFn: () =>
      apiClient.get<TournamentBroadcastWorkspace>(
        `/api/tournaments/${tournamentId}/broadcast`,
      ),
    enabled: !!tournamentId,
    staleTime: 10000,
  });
}
const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  orgId: z.string().uuid().optional(),
});
export function useCreateTournamentBroadcastShow(tournamentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: z.input<typeof createSchema>) =>
      apiClient.post<{ showId: string; orgId: string; tournamentId: string }>(
        `/api/tournaments/${z.string().uuid().parse(tournamentId)}/broadcast/shows`,
        createSchema.parse(input),
      ),
    onSuccess: (result) => {
      void client.invalidateQueries({
        queryKey: ["tournament-broadcast", tournamentId],
      });
      void client.invalidateQueries({
        queryKey: ["broadcast-shows", result.orgId],
      });
      void client.invalidateQueries({
        queryKey: ["broadcast-home", result.orgId],
      });
      const workspace = client.getQueryData<TournamentBroadcastWorkspace>([
        "tournament-broadcast",
        tournamentId,
      ]);
      if (workspace)
        void client.invalidateQueries({
          queryKey: ["tournament-dashboard", workspace.tournament.slug],
        });
    },
  });
}
