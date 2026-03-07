/**
 * useMatchRealtime — live match lifecycle events via SignalR MatchHub.
 *
 * Groups joined: match:{matchId}
 * Events: ReportSubmitted, ReportAccepted, ReportDisputed, DisputeResolved,
 *         CheckInUpdated, StatusChanged
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HubConnectionState } from '@microsoft/signalr';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';

interface MatchRealtimePayload {
  matchId: string;
  status?: string;
  [key: string]: unknown;
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

    conn.on('ReportSubmitted',  handleReportSubmitted);
    conn.on('ReportAccepted',   handleReportAccepted);
    conn.on('ReportDisputed',   handleReportDisputed);
    conn.on('DisputeResolved',  handleDisputeResolved);
    conn.on('StatusChanged',    handleStatusChanged);
    conn.on('CheckInUpdated',   handleCheckInUpdated);

    const join = () => {
      if (!active || conn.state !== HubConnectionState.Connected) return;
      conn.invoke('JoinMatch', matchId).catch(console.warn);
    };
    join();
    conn.onreconnected(join);

    return () => {
      active = false;
      conn.off('ReportSubmitted',  handleReportSubmitted);
      conn.off('ReportAccepted',   handleReportAccepted);
      conn.off('ReportDisputed',   handleReportDisputed);
      conn.off('DisputeResolved',  handleDisputeResolved);
      conn.off('StatusChanged',    handleStatusChanged);
      conn.off('CheckInUpdated',   handleCheckInUpdated);
      if (conn.state === HubConnectionState.Connected)
        conn.invoke('LeaveMatch', matchId).catch(() => {});
    };
  }, [conn, matchId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default useMatchRealtime;
