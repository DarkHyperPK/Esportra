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
    gcTime: 0,
    /**
     * Returns the raw invite token.
     * The caller MUST store this in local state and NOT pass it through
     * TanStack Query cache — the token should be shown once and forgotten.
     */
    mutationFn: async (input: string | { role: string; email?: string }) => {
      const result = await apiClient.post<CrewInviteResult>(
        `/api/broadcast/shows/${showId}/crew/invites`,
        typeof input === 'string' ? { role: input } : input,
      );
      if (typeof input !== 'string' && input.email?.trim() && result.recipientBound !== true) {
        try { await apiClient.delete(`/api/broadcast/shows/${showId}/crew/invites/${result.inviteId}`); }
        catch { throw new Error('The backend does not support account-bound email invites yet. Revoke the newly created pending invite before trying again.'); }
        throw new Error('The backend does not support email invitations yet. The unbound invitation was cancelled. Use a link invite or update the backend.');
      }
      return result;
    },
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

export interface AcceptCrewInviteResult {
  showId: string;
  role: string;
}

export function useAcceptCrewInvite() {
  return useMutation({
    mutationFn: (token: string) =>
      apiClient.post<AcceptCrewInviteResult>(
        '/api/broadcast/crew/invites/accept',
        { token },
      ),
  });
}
