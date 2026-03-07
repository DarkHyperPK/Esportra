/**
 * useBracketRealtime — live bracket match updates via SignalR BracketHub.
 * Replaces Supabase postgres_changes on brkt_matches.
 *
 * Groups joined: bracket:{versionId}
 * Events: MatchUpdated, MatchInserted, BracketReset
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HubConnectionState } from '@microsoft/signalr';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';
import type { BracketNode } from '@/types/bracket-graph';

interface Options {
  versionId: string | null | undefined;
  enabled?: boolean;
  onMatchUpdated?: (node: Partial<BracketNode> & { matchId: string }) => void;
  onBracketReset?: () => void;
}

export function useBracketRealtime({
  versionId,
  enabled = true,
  onMatchUpdated,
  onBracketReset,
}: Options) {
  const conn        = useHub(HubPaths.Bracket);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !versionId) return;

    let active = true;

    const handleMatchUpdated = (payload: Partial<BracketNode> & { matchId?: string }) => {
      if (!active) return;
      const id = payload.matchId ?? (payload as any).id;
      queryClient.setQueriesData<BracketNode[]>(
        { queryKey: ['bracket', versionId] },
        (old) => old ? old.map((n) => n.id === id ? { ...n, ...payload } : n) : old,
      );
      onMatchUpdated?.(payload as Partial<BracketNode> & { matchId: string });
    };

    const handleMatchInserted = (payload: { versionId: string }) => {
      if (!active || payload.versionId !== versionId) return;
      queryClient.invalidateQueries({ queryKey: ['bracket', versionId] });
    };

    const handleBracketReset = () => {
      if (!active) return;
      queryClient.invalidateQueries({ queryKey: ['bracket', versionId] });
      onBracketReset?.();
    };

    conn.on('MatchUpdated', handleMatchUpdated);
    conn.on('MatchInserted', handleMatchInserted);
    conn.on('BracketReset', handleBracketReset);

    const join = () => {
      if (!active || conn.state !== HubConnectionState.Connected) return;
      conn.invoke('JoinBracket', versionId).catch(console.warn);
    };
    join();
    conn.onreconnected(join);

    return () => {
      active = false;
      conn.off('MatchUpdated', handleMatchUpdated);
      conn.off('MatchInserted', handleMatchInserted);
      conn.off('BracketReset', handleBracketReset);
      if (conn.state === HubConnectionState.Connected)
        conn.invoke('LeaveBracket', versionId).catch(() => {});
    };
  }, [conn, versionId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default useBracketRealtime;
