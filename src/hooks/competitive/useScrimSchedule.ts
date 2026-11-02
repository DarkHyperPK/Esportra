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

/** Clears an agreed time before check-in so the captains can start again. */
export function useResetScrimTime(sessionId: string) {
  const refresh = useRefreshScrims();
  return useMutation({
    mutationFn: () => apiClient.post<unknown>(`/api/scrims/sessions/${sessionId}/time/reset`),
    onSuccess: refresh,
  });
}
