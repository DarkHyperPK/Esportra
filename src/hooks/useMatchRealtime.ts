/**
 * useMatchRealtime — live match lifecycle events via SignalR MatchHub.
 *
 * Groups joined: match:{matchId}
 * Events: ReportSubmitted, ReportAccepted, ReportDisputed, DisputeResolved,
 *         CheckInUpdated, StatusChanged,
 *         GoingLive, MatchScoreUpdated, MapResultFinalized (MatchZy)
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HubConnectionState } from '@microsoft/signalr';
import { useHub } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';

interface MatchRealtimePayload {
  matchId: string;
  status?: string;
  [key: string]: unknown;
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
  onCheckInUpdated?:  (payload: MatchRealtimePayload) => void;
  onGoingLive?:       (payload: GoingLivePayload) => void;
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
  onGoingLive,
  onScoreUpdated,
  onMapResult,
}: Options) {
  const conn        = useHub(HubPaths.Match);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !matchId) return;

    let active = true;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] });
      queryClient.invalidateQueries({ queryKey: ['match-result', matchId] });
    };

    const wrap = (cb?: (p: MatchRealtimePayload) => void) =>
      (payload: MatchRealtimePayload) => {
        if (!active) return;
        invalidate();
        cb?.(payload);
      };

    const handleReportSubmitted  = wrap(onReportSubmitted);
    const handleReportAccepted   = wrap(onReportAccepted);
    const handleReportDisputed   = wrap(onReportDisputed);
    const handleDisputeResolved  = wrap(onDisputeResolved);
    const handleStatusChanged    = wrap(onStatusChanged);
    const handleCheckInUpdated   = wrap(onCheckInUpdated);

    // MatchZy live events — invalidate + forward
    const handleGoingLive = (payload: GoingLivePayload) => {
      if (!active) return;
      invalidate();
      onGoingLive?.(payload);
    };
    const handleScoreUpdated = (payload: MatchScorePayload) => {
      if (!active) return;
      queryClient.invalidateQueries({ queryKey: ['match', matchId] });
      onScoreUpdated?.(payload);
    };
    const handleMapResult = (payload: MapResultPayload) => {
      if (!active) return;
      invalidate();
      onMapResult?.(payload);
    };

    conn.on('ReportSubmitted',    handleReportSubmitted);
    conn.on('ReportAccepted',     handleReportAccepted);
    conn.on('ReportDisputed',     handleReportDisputed);
    conn.on('DisputeResolved',    handleDisputeResolved);
    conn.on('StatusChanged',      handleStatusChanged);
    conn.on('CheckInUpdated',     handleCheckInUpdated);
    conn.on('GoingLive',          handleGoingLive);
    conn.on('MatchScoreUpdated',  handleScoreUpdated);
    conn.on('MapResultFinalized', handleMapResult);

    const join = () => {
      if (!active || conn.state !== HubConnectionState.Connected) return;
      conn.invoke('JoinMatch', matchId).catch(console.warn);
    };
    join();
    conn.onreconnected(join);

    return () => {
      active = false;
      conn.off('ReportSubmitted',    handleReportSubmitted);
      conn.off('ReportAccepted',     handleReportAccepted);
      conn.off('ReportDisputed',     handleReportDisputed);
      conn.off('DisputeResolved',    handleDisputeResolved);
      conn.off('StatusChanged',      handleStatusChanged);
      conn.off('CheckInUpdated',     handleCheckInUpdated);
      conn.off('GoingLive',          handleGoingLive);
      conn.off('MatchScoreUpdated',  handleScoreUpdated);
      conn.off('MapResultFinalized', handleMapResult);
      if (conn.state === HubConnectionState.Connected)
        conn.invoke('LeaveMatch', matchId).catch(() => {});
    };
  }, [conn, matchId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default useMatchRealtime;
