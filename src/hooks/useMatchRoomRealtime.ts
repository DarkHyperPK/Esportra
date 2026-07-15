/**
 * useMatchRoomRealtime — single MatchHub subscription for match room pages.
 * Centralizes query invalidation for check-ins, time proposals, and room state.
 */
import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useMatchRealtime,
  type GoingLivePayload,
  type MapResultPayload,
  type MatchScorePayload,
  type ScheduleChangedPayload,
} from '@/hooks/useMatchRealtime';
import { matchRoomStateQueryKey } from '@/hooks/useMatchRoomState';
import { invalidateMatchLifecycleQueries } from '@/utils/matchLifecycleQueries';
import { toRawMatchId } from '@/utils/bracketMatchId';

export const matchCheckinsQueryKey = (matchId: string | undefined) =>
  ['match-checkins', matchId] as const;

export const matchTimeProposalsQueryKey = (matchId: string | undefined) =>
  ['match-time-proposals', matchId] as const;

export const matchResultReportsQueryKey = (matchId: string | undefined) =>
  ['match-result-reports', matchId] as const;

const MATCH_ROOM_POLL_MS_JOINED = 15_000;
const MATCH_ROOM_POLL_MS_DISCONNECTED = 8_000;

interface Options {
  matchId: string | null | undefined;
  versionId?: string | null;
  enabled?: boolean;
  onStatusChanged?: () => void;
  onReportSubmitted?: () => void;
  onReportAccepted?: () => void;
  onReportDisputed?: () => void;
  onDisputeResolved?: () => void;
  onScheduleChanged?: (payload: ScheduleChangedPayload) => void;
  onTimeProposalUpdated?: () => void;
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
  onScheduleChanged,
  onTimeProposalUpdated,
  onGoingLive,
  onScoreUpdated,
  onMapResult,
}: Options) {
  const queryClient = useQueryClient();
  const rawMatchId = matchId ? toRawMatchId(matchId) : '';
  const isEnabled = enabled && !!rawMatchId;

  const invalidateLifecycle = useCallback(() => {
    invalidateMatchLifecycleQueries(queryClient, { matchId: rawMatchId, versionId });
  }, [queryClient, rawMatchId, versionId]);

  const invalidateRoomState = useCallback(() => {
    if (!rawMatchId) return;
    void queryClient.invalidateQueries({ queryKey: matchRoomStateQueryKey(rawMatchId) });
  }, [rawMatchId, queryClient]);

  const invalidateCheckins = useCallback(() => {
    if (!rawMatchId) return;
    void queryClient.invalidateQueries({ queryKey: matchCheckinsQueryKey(rawMatchId) });
  }, [rawMatchId, queryClient]);

  const invalidateProposals = useCallback(() => {
    if (!rawMatchId) return;
    void queryClient.invalidateQueries({ queryKey: matchTimeProposalsQueryKey(rawMatchId) });
  }, [rawMatchId, queryClient]);

  const invalidateReports = useCallback(() => {
    if (!rawMatchId) return;
    void queryClient.invalidateQueries({ queryKey: matchResultReportsQueryKey(rawMatchId) });
    void queryClient.invalidateQueries({ queryKey: ['match-dispute', rawMatchId] });
  }, [rawMatchId, queryClient]);

  const { joined } = useMatchRealtime({
    matchId: rawMatchId,
    enabled: isEnabled,
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
      onTimeProposalUpdated?.();
    },
    onScheduleChanged: (payload) => {
      invalidateProposals();
      invalidateRoomState();
      invalidateLifecycle();
      onScheduleChanged?.(payload);
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

  useEffect(() => {
    if (!isEnabled || !rawMatchId) return;

    const pollMs = joined ? MATCH_ROOM_POLL_MS_JOINED : MATCH_ROOM_POLL_MS_DISCONNECTED;
    const timer = window.setInterval(() => {
      invalidateRoomState();
      invalidateProposals();
      invalidateCheckins();
    }, pollMs);

    return () => window.clearInterval(timer);
  }, [
    isEnabled,
    rawMatchId,
    joined,
    invalidateRoomState,
    invalidateProposals,
    invalidateCheckins,
  ]);

  return { joined };
}

export default useMatchRoomRealtime;
