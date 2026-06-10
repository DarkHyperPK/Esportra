/**
 * useMatchRoomRealtime — single MatchHub subscription for match room pages.
 * Centralizes query invalidation for check-ins, time proposals, and room state.
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useMatchRealtime,
  type GoingLivePayload,
  type MapResultPayload,
  type MatchScorePayload,
} from '@/hooks/useMatchRealtime';
import { matchRoomStateQueryKey } from '@/hooks/useMatchRoomState';

export const matchCheckinsQueryKey = (matchId: string | undefined) =>
  ['match-checkins', matchId] as const;

export const matchTimeProposalsQueryKey = (matchId: string | undefined) =>
  ['match-time-proposals', matchId] as const;

export const matchResultReportsQueryKey = (matchId: string | undefined) =>
  ['match-result-reports', matchId] as const;

interface Options {
  matchId: string | null | undefined;
  enabled?: boolean;
  onStatusChanged?: () => void;
  onReportSubmitted?: () => void;
  onReportAccepted?: () => void;
  onReportDisputed?: () => void;
  onDisputeResolved?: () => void;
  onGoingLive?: (payload: GoingLivePayload) => void;
  onScoreUpdated?: (payload: MatchScorePayload) => void;
  onMapResult?: (payload: MapResultPayload) => void;
  debouncedBracketInvalidate?: () => void;
}

export function useMatchRoomRealtime({
  matchId,
  enabled = true,
  onStatusChanged,
  onReportSubmitted,
  onReportAccepted,
  onReportDisputed,
  onDisputeResolved,
  onGoingLive,
  onScoreUpdated,
  onMapResult,
  debouncedBracketInvalidate,
}: Options) {
  const queryClient = useQueryClient();

  const invalidateRoomState = useCallback(() => {
    if (!matchId) return;
    void queryClient.invalidateQueries({ queryKey: matchRoomStateQueryKey(matchId) });
  }, [matchId, queryClient]);

  const invalidateCheckins = useCallback(() => {
    if (!matchId) return;
    void queryClient.invalidateQueries({ queryKey: matchCheckinsQueryKey(matchId) });
  }, [matchId, queryClient]);

  const invalidateProposals = useCallback(() => {
    if (!matchId) return;
    void queryClient.invalidateQueries({ queryKey: matchTimeProposalsQueryKey(matchId) });
  }, [matchId, queryClient]);

  const invalidateReports = useCallback(() => {
    if (!matchId) return;
    void queryClient.invalidateQueries({ queryKey: matchResultReportsQueryKey(matchId) });
    void queryClient.invalidateQueries({ queryKey: ['match-dispute', matchId] });
  }, [matchId, queryClient]);

  useMatchRealtime({
    matchId,
    enabled: enabled && !!matchId,
    onCheckInUpdated: () => {
      invalidateCheckins();
      invalidateProposals();
      invalidateRoomState();
      debouncedBracketInvalidate?.();
    },
    onTimeProposalUpdated: () => {
      invalidateProposals();
      invalidateRoomState();
      debouncedBracketInvalidate?.();
    },
    onStatusChanged: () => {
      debouncedBracketInvalidate?.();
      onStatusChanged?.();
      invalidateCheckins();
      invalidateProposals();
      invalidateRoomState();
      invalidateReports();
    },
    onReportSubmitted: () => {
      debouncedBracketInvalidate?.();
      onReportSubmitted?.();
      invalidateReports();
      invalidateRoomState();
    },
    onReportAccepted: () => {
      debouncedBracketInvalidate?.();
      onReportAccepted?.();
      invalidateReports();
      invalidateRoomState();
      void queryClient.invalidateQueries({ queryKey: ['bracket'] });
      void queryClient.invalidateQueries({ queryKey: ['captain-all-matches'] });
    },
    onReportDisputed: () => {
      debouncedBracketInvalidate?.();
      onReportDisputed?.();
      invalidateReports();
      invalidateRoomState();
    },
    onDisputeResolved: () => {
      debouncedBracketInvalidate?.();
      onDisputeResolved?.();
      invalidateReports();
      invalidateRoomState();
    },
    onGoingLive,
    onScoreUpdated,
    onMapResult,
  });
}

export default useMatchRoomRealtime;
