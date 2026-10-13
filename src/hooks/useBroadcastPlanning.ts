import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/apiClient";
import type { BroadcastShow } from "@/types/broadcast";

export interface BroadcastHomeData {
  shows: Pick<
    BroadcastShow,
    | "id"
    | "title"
    | "status"
    | "scheduledAt"
    | "tournamentId"
    | "tournamentName"
  >[];
  nodes: {
    id: string;
    name: string;
    lastSeenAt: string | null;
    isActive: boolean;
  }[];
  crewCount: number;
  alerts: unknown[];
}
export interface OrganizationTournament {
  id: string;
  name: string;
  slug: string;
  game: string;
}
export function useBroadcastHome(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["broadcast-home", orgId],
    queryFn: () =>
      apiClient.get<BroadcastHomeData>(`/api/broadcast/home?orgId=${orgId}`),
    enabled: !!orgId,
    staleTime: 10000,
    refetchInterval: 15000,
  });
}
export function useBroadcastTournaments(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["broadcast-tournaments", orgId],
    queryFn: () =>
      apiClient.get<OrganizationTournament[]>(
        `/api/organizations/${orgId}/tournaments`,
      ),
    enabled: !!orgId,
    staleTime: 30000,
  });
}
const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    tournamentId: z.string().uuid().nullable().optional(),
    scheduledAt: z.string().datetime().nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, "Provide a change.");
export function useUpdateBroadcastShow(showId: string, orgId?: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: z.input<typeof updateSchema>) =>
      apiClient.patch(
        `/api/broadcast/shows/${showId}`,
        updateSchema.parse(input),
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["broadcast-show", showId] });
      void client.invalidateQueries({ queryKey: ["broadcast-shows", orgId] });
      void client.invalidateQueries({ queryKey: ["broadcast-home", orgId] });
    },
  });
}
export function useCreateNodePairingCode() {
  return useMutation({
    mutationFn: (orgId: string) =>
      apiClient.post<{ code: string; expiresAt: string }>(
        "/api/broadcast/nodes/codes",
        { orgId: z.string().uuid().parse(orgId) },
      ),
  });
}
