/**
 * useMatchRealtime — live match lifecycle events via SignalR MatchHub.
 *
 * Groups joined: match:{matchId}
 * Events: ReportSubmitted, ReportAccepted, ReportDisputed, DisputeResolved,
 *         CheckInUpdated, TimeProposalUpdated, StatusChanged, ScheduleChanged,
 *         GoingLive, MatchScoreUpdated, MapResultFinalized (MatchZy)
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useHub } from '@/hooks/useSignalR';
import { useHubGroupJoin } from '@/hooks/useHubGroupJoin';
import { HubPaths } from '@/lib/signalrClient';
import { toRawMatchId } from '@/utils/bracketMatchId';

interface MatchRealtimePayload {
  matchId: string;
  status?: string;
  [key: string]: unknown;
}

export interface ScheduleChangedPayload {
  matchId: string;
  scheduledTime?: string | null;
  matchNumber?: number;
  roundIndex?: number;
  changedBy?: string;
}

export interface MatchScorePayload {
  matchId: string;
  gameNumber: number;
  mapNumber: number;
  team1Score: number;
  team2Score: number;
  team1SeriesScore: number;
  team2SeriesScore: number;
}

export interface GoingLivePayload {
  matchId: string;
  mapNumber: number;
  gameNumber: number;
}

export interface MapResultPayload {
  matchId: string;
  gameNumber: number;
  mapNumber: number;
  team1Score: number;
  team2Score: number;
  winner: string | null;
}

interface Options {
  matchId: string | null | undefined;
  enabled?: boolean;
  onReportSubmitted?: (payload: MatchRealtimePayload) => void;
  onReportAccepted?:  (payload: MatchRealtimePayload) => void;
  onReportDisputed?:  (payload: MatchRealtimePayload) => void;
  onDisputeResolved?: (payload: MatchRealtimePayload) => void;
  onStatusChanged?:   (payload: MatchRealtimePayload) => void;
  onCheckInUpdated?:       (payload: MatchRealtimePayload) => void;
  onTimeProposalUpdated?:  (payload: MatchRealtimePayload) => void;
  onScheduleChanged?: (payload: ScheduleChangedPayload) => void;
  onGoingLive?:            (payload: GoingLivePayload) => void;
  onScoreUpdated?:    (payload: MatchScorePayload) => void;
  onMapResult?:       (payload: MapResultPayload) => void;
}

export function useMatchRealtime({
  matchId,
  enabled = true,
  onReportSubmitted,
  onReportAccepted,
  onReportDisputed,
  onDisputeResolved,
  onStatusChanged,
  onCheckInUpdated,
  onTimeProposalUpdated,
  onScheduleChanged,
  onGoingLive,
  onScoreUpdated,
  onMapResult,
}: Options) {
  const rawMatchId = matchId ? toRawMatchId(matchId) : '';
  const isEnabled = enabled && !!rawMatchId;
  const conn = useHub(HubPaths.Match);
  const queryClient = useQueryClient();

  const callbacksRef = useRef({
    onReportSubmitted,
    onReportAccepted,
    onReportDisputed,
    onDisputeResolved,
    onStatusChanged,
    onCheckInUpdated,
    onTimeProposalUpdated,
    onScheduleChanged,
    onGoingLive,
    onScoreUpdated,
    onMapResult,
  });
  callbacksRef.current = {
    onReportSubmitted,
    onReportAccepted,
    onReportDisputed,
    onDisputeResolved,
    onStatusChanged,
    onCheckInUpdated,
    onTimeProposalUpdated,
    onScheduleChanged,
    onGoingLive,
    onScoreUpdated,
    onMapResult,
  };

  const joinGroup = useCallback(
    () => conn.invoke('JoinMatch', rawMatchId),
    [conn, rawMatchId],
  );
  const leaveGroup = useCallback(
    () => conn.invoke('LeaveMatch', rawMatchId),
    [conn, rawMatchId],
  );

  const { joined, connectionState } = useHubGroupJoin(conn, {
    enabled: isEnabled,
    join: joinGroup,
    leave: leaveGroup,
  });

  useEffect(() => {
    if (!isEnabled) return;

    let active = true;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['match', rawMatchId] });
      queryClient.invalidateQueries({ queryKey: ['match-result', rawMatchId] });
    };

    const wrap = (cb?: (p: MatchRealtimePayload) => void) =>
      (payload: MatchRealtimePayload) => {
        if (!active) return;
        invalidate();
        cb?.(payload);
      };

    const handleReportSubmitted = wrap((p) => callbacksRef.current.onReportSubmitted?.(p));
    const handleReportAccepted = wrap((p) => callbacksRef.current.onReportAccepted?.(p));
    const handleReportDisputed = wrap((p) => callbacksRef.current.onReportDisputed?.(p));
    const handleDisputeResolved = wrap((p) => callbacksRef.current.onDisputeResolved?.(p));
    const handleStatusChanged = wrap((p) => callbacksRef.current.onStatusChanged?.(p));
    const handleCheckInUpdated = wrap((p) => callbacksRef.current.onCheckInUpdated?.(p));
    const handleTimeProposalUpdated = wrap((p) => callbacksRef.current.onTimeProposalUpdated?.(p));

    const handleScheduleChanged = (payload: ScheduleChangedPayload) => {
      if (!active) return;
      invalidate();
      callbacksRef.current.onScheduleChanged?.(payload);
    };

    const handleGoingLive = (payload: GoingLivePayload) => {
      if (!active) return;
      invalidate();
      callbacksRef.current.onGoingLive?.(payload);
    };
    const handleScoreUpdated = (payload: MatchScorePayload) => {
      if (!active) return;
      queryClient.invalidateQueries({ queryKey: ['match', rawMatchId] });
      callbacksRef.current.onScoreUpdated?.(payload);
    };
    const handleMapResult = (payload: MapResultPayload) => {
      if (!active) return;
      invalidate();
      callbacksRef.current.onMapResult?.(payload);
    };

    conn.on('ReportSubmitted',    handleReportSubmitted);
    conn.on('ReportAccepted',     handleReportAccepted);
    conn.on('ReportDisputed',     handleReportDisputed);
    conn.on('DisputeResolved',    handleDisputeResolved);
    conn.on('StatusChanged',      handleStatusChanged);
    conn.on('CheckInUpdated',        handleCheckInUpdated);
    conn.on('TimeProposalUpdated',   handleTimeProposalUpdated);
    conn.on('ScheduleChanged',       handleScheduleChanged);
    conn.on('GoingLive',             handleGoingLive);
    conn.on('MatchScoreUpdated',  handleScoreUpdated);
    conn.on('MapResultFinalized', handleMapResult);

    return () => {
      active = false;
      conn.off('ReportSubmitted',    handleReportSubmitted);
      conn.off('ReportAccepted',     handleReportAccepted);
      conn.off('ReportDisputed',     handleReportDisputed);
      conn.off('DisputeResolved',    handleDisputeResolved);
      conn.off('StatusChanged',      handleStatusChanged);
      conn.off('CheckInUpdated',        handleCheckInUpdated);
      conn.off('TimeProposalUpdated',   handleTimeProposalUpdated);
      conn.off('ScheduleChanged',       handleScheduleChanged);
      conn.off('GoingLive',             handleGoingLive);
      conn.off('MatchScoreUpdated',  handleScoreUpdated);
      conn.off('MapResultFinalized', handleMapResult);
    };
  }, [conn, rawMatchId, isEnabled, queryClient]);

  return { joined, connectionState };
}

export default useMatchRealtime;
