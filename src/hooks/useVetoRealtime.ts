/**
 * useVetoRealtime — live veto state via SignalR VetoHub.
 *
 * Groups joined: veto:{matchId}
 * Events: VetoAction (full state), VetoComplete (maps array), VetoReset, StateSync (on join)
 *
 * Usage: call alongside useMapVetoMachine to receive live state pushes.
 * The VetoHub sends the full MatchMapVeto record on every action so the client
 * can replace its local state wholesale instead of diffing.
 */

import { useCallback, useEffect } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import { useHub } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';

interface VetoStatePayload {
  match_id: string;
  status: string;
  current_action: number;
  current_team_id: string | null;
  best_of: number;
  [key: string]: unknown;
}

interface Options {
  matchId: string | null | undefined;
  enabled?: boolean;
  /** Called whenever the veto state changes (VetoAction or StateSync). */
  onStateUpdate?: (state: VetoStatePayload) => void;
  /** Called when veto is fully complete. Payload = picked maps array. */
  onComplete?: (maps: unknown[]) => void;
  /** Called when organizer resets the veto. */
  onReset?: () => void;
}

export function useVetoRealtime({ matchId, enabled = true, onStateUpdate, onComplete, onReset }: Options) {
  const conn = useHub(HubPaths.Veto);

  useEffect(() => {
    if (!enabled || !matchId) return;

    let active = true;

    const handleAction = (state: VetoStatePayload) => {
      if (!active) return;
      onStateUpdate?.(state);
    };

    const handleComplete = (maps: unknown[]) => {
      if (!active) return;
      onComplete?.(maps);
    };

    const handleReset = () => {
      if (!active) return;
      onReset?.();
    };

    conn.on('VetoAction', handleAction);
    conn.on('StateSync',  handleAction); // same shape, re-use handler
    conn.on('VetoComplete', handleComplete);
    conn.on('VetoReset', handleReset);

    // JoinVeto triggers an immediate StateSync response from the hub
    const join = () => {
      if (!active || conn.state !== HubConnectionState.Connected) return;
      conn.invoke('JoinVeto', matchId).catch(console.warn);
    };
    join();
    conn.onreconnected(join);

    return () => {
      active = false;
      conn.off('VetoAction',   handleAction);
      conn.off('StateSync',    handleAction);
      conn.off('VetoComplete', handleComplete);
      conn.off('VetoReset',    handleReset);
      if (conn.state === HubConnectionState.Connected)
        conn.invoke('LeaveVeto', matchId).catch(() => {});
    };
  }, [conn, matchId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Manually request current veto state (triggers StateSync from server). */
  const requestStateSync = useCallback(() => {
    if (matchId && conn.state === HubConnectionState.Connected)
      conn.invoke('JoinVeto', matchId).catch(console.warn);
  }, [conn, matchId]);

  return { requestStateSync };
}

export default useVetoRealtime;
