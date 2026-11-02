/**
 * useScrimSchedule
 *
 * Agreeing a scrim's time: propose, accept or decline. Every change can move
 * the match time, the queue and the agenda, so all scrim queries refresh.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { competitiveApiClient as apiClient } from '@/hooks/competitive/competitiveApiClient';
import type { ScrimTimeProposal } from '@/types/competitive';

interface ProposeInput {
  /** ISO instant. */
  proposedAt: string;
  note?: string;
}

function useRefreshScrims() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['scrims'] });
}

export function useProposeTime(sessionId: string) {
  const refresh = useRefreshScrims();
  return useMutation({
    mutationFn: (input: ProposeInput) =>
      apiClient.post<ScrimTimeProposal>(`/api/scrims/sessions/${sessionId}/time-proposals`, {
        proposedAt: input.proposedAt,
        note: input.note,
      }),
    onSuccess: refresh,
  });
}

export function useAcceptTimeProposal(proposalId: string) {
  const refresh = useRefreshScrims();
  return useMutation({
    mutationFn: () => apiClient.post<{ scheduledAt: string }>(`/api/scrims/time-proposals/${proposalId}/accept`),
    onSuccess: refresh,
  });
}

export function useDeclineTimeProposal(proposalId: string) {
  const refresh = useRefreshScrims();
  return useMutation({
    mutationFn: () => apiClient.post<unknown>(`/api/scrims/time-proposals/${proposalId}/decline`),
    onSuccess: refresh,
  });
}

/** The proposing team takes its own pending proposal back (a mis-click, a wrong date). */
export function useWithdrawTimeProposal(proposalId: string) {
  const refresh = useRefreshScrims();
  return useMutation({
    mutationFn: () => apiClient.post<unknown>(`/api/scrims/time-proposals/${proposalId}/withdraw`),
    onSuccess: refresh,
  });
}

/** Asks the other team to agree to clear the agreed time. Nothing changes until they do. */
export function useRequestTimeClear(sessionId: string) {
  const refresh = useRefreshScrims();
  return useMutation({
    mutationFn: () => apiClient.post<unknown>(`/api/scrims/sessions/${sessionId}/time/clear-request`),
    onSuccess: refresh,
  });
}

/** The other team agrees to clear the time (it is cleared) or keeps it. */
export function useRespondTimeClear(requestId: string) {
  const refresh = useRefreshScrims();
  return useMutation({
    mutationFn: (agree: boolean) =>
      apiClient.post<unknown>(`/api/scrims/time-clear-requests/${requestId}/${agree ? 'accept' : 'decline'}`),
    onSuccess: refresh,
  });
}

export function useWithdrawTimeClear(requestId: string) {
  const refresh = useRefreshScrims();
  return useMutation({
    mutationFn: () => apiClient.post<unknown>(`/api/scrims/time-clear-requests/${requestId}/withdraw`),
    onSuccess: refresh,
  });
}
