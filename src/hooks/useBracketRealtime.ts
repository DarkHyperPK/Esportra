/**
 * useBracketRealtime — live bracket match updates via SignalR BracketHub.
 * Replaces Supabase postgres_changes on brkt_matches.
 *
 * Groups joined: bracket:{versionId}
 * Events: MatchUpdated, MatchInserted, BracketReset
 */

import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useHub } from '@/hooks/useSignalR';
import { useHubGroupJoin } from '@/hooks/useHubGroupJoin';
import { HubPaths } from '@/lib/signalrClient';
import { matchRoomStateQueryKey } from '@/hooks/useMatchRoomState';
import { toRawMatchId } from '@/utils/bracketMatchId';
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
  const conn = useHub(HubPaths.Bracket);
  const queryClient = useQueryClient();
  const isEnabled = enabled && !!versionId;

  const joinGroup = useCallback(
    () => conn.invoke('JoinBracket', versionId!),
    [conn, versionId],
  );
  const leaveGroup = useCallback(
    () => conn.invoke('LeaveBracket', versionId!),
    [conn, versionId],
  );

  const { joined } = useHubGroupJoin(conn, {
    enabled: isEnabled,
    join: joinGroup,
    leave: leaveGroup,
    onJoinError: (error) => {
      if (import.meta.env.DEV) {
        console.warn(`[BracketRealtime] JoinBracket failed for ${versionId}`, error);
      }
    },
  });

  useEffect(() => {
    if (!isEnabled || !versionId) return;

    let active = true;

    const invalidateCaptainQueries = (matchId?: string) => {
      queryClient.invalidateQueries({ queryKey: ['bracket-graph', versionId] });
      queryClient.invalidateQueries({ queryKey: ['captain-all-matches'] });
      queryClient.invalidateQueries({ queryKey: ['captain-organizer-graph', versionId] });
      if (matchId) {
        const rawId = toRawMatchId(matchId);
        if (rawId) {
          queryClient.invalidateQueries({ queryKey: matchRoomStateQueryKey(rawId) });
        }
      }
    };

    const handleMatchUpdated = (payload: Partial<BracketNode> & { matchId?: string }) => {
      if (!active) return;
      invalidateCaptainQueries(payload.matchId);
      onMatchUpdated?.(payload as Partial<BracketNode> & { matchId: string });
    };

    const handleMatchInserted = (payload: { versionId: string }) => {
      if (!active || payload.versionId !== versionId) return;
      invalidateCaptainQueries();
    };

    const handleBracketReset = () => {
      if (!active) return;
      invalidateCaptainQueries();
      onBracketReset?.();
    };

    conn.on('MatchUpdated', handleMatchUpdated);
    conn.on('MatchInserted', handleMatchInserted);
    conn.on('BracketReset', handleBracketReset);

    return () => {
      active = false;
      conn.off('MatchUpdated', handleMatchUpdated);
      conn.off('MatchInserted', handleMatchInserted);
      conn.off('BracketReset', handleBracketReset);
    };
  }, [conn, versionId, isEnabled, queryClient, onMatchUpdated, onBracketReset]);

  return { joined };
}

export default useBracketRealtime;
