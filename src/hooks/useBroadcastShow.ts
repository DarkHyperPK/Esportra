import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { z } from 'zod';
import type { BroadcastShowDetail, BroadcastShowStatus } from '@/types/broadcast';

export const broadcastShowQueryKey = (showId: string) =>
  ['broadcast-show', showId] as const;

export function useBroadcastShow(showId: string | undefined) {
  return useQuery({
    queryKey: broadcastShowQueryKey(showId ?? ''),
    queryFn: () =>
      apiClient.get<BroadcastShowDetail>(`/api/broadcast/shows/${showId}`),
    enabled: !!showId,
    staleTime: 30_000,
    refetchInterval: 5000,
  });
}

export function useUpdateShowStatus(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (status: BroadcastShowStatus) =>
      apiClient.patch<{ success: true; status: BroadcastShowStatus }>(
        `/api/broadcast/shows/${showId}/status`,
        { status },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: broadcastShowQueryKey(showId) });
      void qc.invalidateQueries({ queryKey: ['broadcast-publication', showId] });
      const show = qc.getQueryData<BroadcastShowDetail>(broadcastShowQueryKey(showId));
      if (show?.orgId) {
        void qc.invalidateQueries({ queryKey: ['broadcast-shows', show.orgId] });
        void qc.invalidateQueries({ queryKey: ['broadcast-home', show.orgId] });
      }
    },
  });
}

export function usePushShowConfig(showId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string | void) => matchId
      ? apiClient.post<{ success: true }>(`/api/broadcast/shows/${showId}/push-config`, { matchId: z.string().uuid().parse(matchId) })
      : apiClient.post<{ success: true }>(`/api/broadcast/shows/${showId}/push-config`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: broadcastShowQueryKey(showId) });
      void qc.invalidateQueries({ queryKey: ['broadcast-publication', showId] });
    },
  });
}

export function useAddMatchSlot(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      matchCode,
      displayOrder,
    }: {
      matchId: string;
      matchCode?: string;
      displayOrder?: number;
    }) =>
      apiClient.post<{ slotId: string }>(
        `/api/broadcast/shows/${showId}/matches`,
        { matchId, ...(matchCode ? { matchCode } : {}), ...(displayOrder !== undefined ? { displayOrder } : {}) },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: broadcastShowQueryKey(showId) });
    },
  });
}

export function useRemoveMatchSlot(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) =>
      apiClient.delete(`/api/broadcast/shows/${showId}/matches/${matchId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: broadcastShowQueryKey(showId) });
    },
  });
}
