import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { BroadcastCrewMember, BroadcastPendingInvite, CrewInviteResult } from '@/types/broadcast';

export const crewQueryKey = (showId: string) =>
  ['broadcast-crew', showId] as const;

interface CrewListResponse {
  crew: BroadcastCrewMember[];
  pendingInvites: BroadcastPendingInvite[];
}

export function useBroadcastCrew(showId: string | undefined) {
  return useQuery({
    queryKey: crewQueryKey(showId ?? ''),
    queryFn: () =>
      apiClient.get<CrewListResponse>(
        `/api/broadcast/shows/${showId}/crew`,
      ),
    enabled: !!showId,
    staleTime: 30_000,
  });
}

export function useCreateCrewInvite(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    /**
     * Returns the raw invite token.
     * The caller MUST store this in local state and NOT pass it through
     * TanStack Query cache — the token should be shown once and forgotten.
     */
    mutationFn: (role: string) =>
      apiClient.post<CrewInviteResult>(
        `/api/broadcast/shows/${showId}/crew/invites`,
        { role },
      ),
    onSuccess: () => {
      // Refresh pending invites list (does NOT cache the raw token).
      void qc.invalidateQueries({ queryKey: crewQueryKey(showId) });
    },
  });
}

export function useRevokeCrewInvite(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      apiClient.delete(
        `/api/broadcast/shows/${showId}/crew/invites/${inviteId}`,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: crewQueryKey(showId) });
    },
  });
}

export function useRemoveCrewMember(showId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`/api/broadcast/shows/${showId}/crew/${userId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: crewQueryKey(showId) });
    },
  });
}
