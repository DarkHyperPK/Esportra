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
import { invalidateMatchLifecycleQueries } from '@/utils/matchLifecycleQueries';

export const matchCheckinsQueryKey = (matchId: string | undefined) =>
  ['match-checkins', matchId] as const;

export const matchTimeProposalsQueryKey = (matchId: string | undefined) =>
  ['match-time-proposals', matchId] as const;

export const matchResultReportsQueryKey = (matchId: string | undefined) =>
  ['match-result-reports', matchId] as const;

interface Options {
  matchId: string | null | undefined;
  versionId?: string | null;
  enabled?: boolean;
  onStatusChanged?: () => void;
  onReportSubmitted?: () => void;
  onReportAccepted?: () => void;
  onReportDisputed?: () => void;
  onDisputeResolved?: () => void;
  onGoingLive?: (payload: GoingLivePayload) => void;
  onScoreUpdated?: (payload: MatchScorePayload) => void;
  onMapResult?: (payload: MapResultPayload) => void;
}

export function useMatchRoomRealtime({
  matchId,
  versionId,
  enabled = true,
  onStatusChanged,
  onReportSubmitted,
  onReportAccepted,
  onReportDisputed,
  onDisputeResolved,
  onGoingLive,
  onScoreUpdated,
  onMapResult,
}: Options) {
  const queryClient = useQueryClient();

  const invalidateLifecycle = useCallback(() => {
    invalidateMatchLifecycleQueries(queryClient, { matchId, versionId });
  }, [queryClient, matchId, versionId]);

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
      invalidateLifecycle();
    },
    onTimeProposalUpdated: () => {
      invalidateProposals();
      invalidateRoomState();
      invalidateLifecycle();
    },
    onStatusChanged: () => {
      invalidateLifecycle();
      onStatusChanged?.();
      invalidateCheckins();
      invalidateProposals();
      invalidateRoomState();
      invalidateReports();
    },
    onReportSubmitted: () => {
      invalidateLifecycle();
      onReportSubmitted?.();
      invalidateReports();
      invalidateRoomState();
    },
    onReportAccepted: () => {
      invalidateLifecycle();
      onReportAccepted?.();
      invalidateReports();
      invalidateRoomState();
    },
    onReportDisputed: () => {
      invalidateLifecycle();
      onReportDisputed?.();
      invalidateReports();
      invalidateRoomState();
    },
    onDisputeResolved: () => {
      invalidateLifecycle();
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
