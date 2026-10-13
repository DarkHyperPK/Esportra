import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { BroadcastShow } from "@/types/broadcast";
import {
  createShowSchema,
  type CreateShowInput,
} from "@/schemas/broadcastSchema";
import { z } from "zod";

export const broadcastShowsQueryKey = (orgId: string) =>
  ["broadcast-shows", orgId] as const;

export function useBroadcastShows(orgId: string | null | undefined) {
  return useQuery({
    queryKey: broadcastShowsQueryKey(orgId ?? ""),
    queryFn: () =>
      apiClient.get<BroadcastShow[]>(`/api/broadcast/shows?orgId=${orgId}`),
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

export function useCreateBroadcastShow(orgId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateShowInput) => {
      const parsed = createShowSchema.parse(input);
      return apiClient.post<{ showId: string }>("/api/broadcast/shows", {
        orgId,
        title: parsed.title,
        tournamentId: parsed.tournamentId || null,
        scheduledAt: parsed.scheduledAt || null,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: broadcastShowsQueryKey(orgId) });
      void qc.invalidateQueries({ queryKey: ["broadcast-home", orgId] });
    },
  });
}

export function useDuplicateBroadcastShow(orgId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (showId: string) =>
      apiClient.post<{ showId: string }>(
        `/api/broadcast/shows/${z.string().uuid().parse(showId)}/duplicate`,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: broadcastShowsQueryKey(orgId) });
      void qc.invalidateQueries({ queryKey: ["broadcast-home", orgId] });
    },
  });
}

export function useDeleteBroadcastShow(orgId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (showId: string) =>
      apiClient.delete(
        `/api/broadcast/shows/${z.string().uuid().parse(showId)}`,
      ),
    onSuccess: (_result, showId) => {
      void qc.invalidateQueries({ queryKey: broadcastShowsQueryKey(orgId) });
      void qc.invalidateQueries({ queryKey: ["broadcast-home", orgId] });
      qc.removeQueries({ queryKey: ["broadcast-show", showId] });
    },
  });
}
