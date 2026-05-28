/**
 * useBRRealtime — live BR round/evidence/leaderboard updates via SignalR BRHub.
 * Invalidates TanStack Query caches on hub events; does not push full state.
 */

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HubConnectionState } from '@microsoft/signalr';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';

interface BrEventScope {
  stageId?: string | null;
  groupId?: string | null;
  roundId?: string | null;
}

interface UseBRRealtimeOptions extends BrEventScope {
  tournamentId?: string | null;
  enabled?: boolean;
}

interface BrScopedPayload extends BrEventScope {
  roundId?: string;
}

const matchesScope = (payload: BrScopedPayload, scope: BrEventScope) => {
  if (scope.stageId && payload.stageId && payload.stageId !== scope.stageId) return false;
  if (scope.groupId && payload.groupId && payload.groupId !== scope.groupId) return false;
  if (scope.roundId && payload.roundId && payload.roundId !== scope.roundId) return false;
  return true;
};

export function useBRRealtime({
  stageId,
  groupId,
  roundId,
  tournamentId,
  enabled = true,
}: UseBRRealtimeOptions) {
  const conn = useHub(HubPaths.BR);
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    let active = true;
    let joined = false;
    const scope = { stageId, groupId, roundId };

    const invalidateRounds = () => {
      if (stageId && groupId) {
        queryClient.invalidateQueries({ queryKey: ['br-rounds', stageId, groupId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['br-rounds'] });
      }
    };

    const invalidateRoundResults = (targetRoundId?: string | null) => {
      const id = targetRoundId ?? roundId;
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['br-round-results', id] });
      }
    };

    const invalidateRoundEvidence = (targetRoundId?: string | null) => {
      const id = targetRoundId ?? roundId;
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['br-round-evidence', id] });
      }
    };

    const invalidateLeaderboard = () => {
      if (stageId && groupId) {
        queryClient.invalidateQueries({ queryKey: ['br-group-leaderboard', stageId, groupId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['br-group-leaderboard'] });
      }
    };

    const invalidatePlayerContext = () => {
      if (tournamentId) {
        queryClient.invalidateQueries({ queryKey: ['br-player-context', tournamentId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['br-player-context'] });
      }
    };

    const handleRoundCreated = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateRounds();
      invalidatePlayerContext();
    };

    const handleRoundUpdated = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateRounds();
      invalidatePlayerContext();
      invalidateLeaderboard();
    };

    const handleRoundReset = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateRounds();
      invalidateRoundResults(payload.roundId);
      invalidateRoundEvidence(payload.roundId);
      invalidateLeaderboard();
      invalidatePlayerContext();
    };

    const handleEvidenceSubmitted = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateRoundEvidence(payload.roundId);
      invalidateRounds();
    };

    const handleEvidenceReviewed = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateRoundEvidence(payload.roundId);
      invalidateRounds();
    };

    const handleResultsUpdated = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateRoundResults(payload.roundId);
      invalidateRounds();
      invalidateLeaderboard();
    };

    const handleLeaderboardUpdated = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateLeaderboard();
    };

    conn.on('RoundCreated', handleRoundCreated);
    conn.on('RoundUpdated', handleRoundUpdated);
    conn.on('RoundReset', handleRoundReset);
    conn.on('EvidenceSubmitted', handleEvidenceSubmitted);
    conn.on('EvidenceReviewed', handleEvidenceReviewed);
    conn.on('ResultsUpdated', handleResultsUpdated);
    conn.on('LeaderboardUpdated', handleLeaderboardUpdated);

    const join = async () => {
      if (!active || joined || conn.state !== HubConnectionState.Connected) return;

      try {
        await Promise.all([
          stageId ? conn.invoke('JoinStage', stageId) : Promise.resolve(),
          groupId ? conn.invoke('JoinGroup', groupId) : Promise.resolve(),
          roundId ? conn.invoke('JoinRound', roundId) : Promise.resolve(),
        ]);

        if (active) {
          joined = true;
          setConnected(true);
        }
      } catch (error) {
        if (active) {
          joined = false;
          setConnected(false);
          console.warn('[BRRealtime] Failed to join stream', error);
        }
      }
    };

    const syncConnection = () => {
      if (!active) return;

      if (conn.state !== HubConnectionState.Connected) {
        joined = false;
        setConnected(false);
        return;
      }

      void join();
    };

    syncConnection();
    const timer = window.setInterval(syncConnection, 1_000);

    return () => {
      active = false;
      window.clearInterval(timer);
      conn.off('RoundCreated', handleRoundCreated);
      conn.off('RoundUpdated', handleRoundUpdated);
      conn.off('RoundReset', handleRoundReset);
      conn.off('EvidenceSubmitted', handleEvidenceSubmitted);
      conn.off('EvidenceReviewed', handleEvidenceReviewed);
      conn.off('ResultsUpdated', handleResultsUpdated);
      conn.off('LeaderboardUpdated', handleLeaderboardUpdated);

      if (conn.state === HubConnectionState.Connected) {
        if (roundId) conn.invoke('LeaveRound', roundId).catch(() => {});
        if (groupId) conn.invoke('LeaveGroup', groupId).catch(() => {});
        if (stageId) conn.invoke('LeaveStage', stageId).catch(() => {});
      }
    };
  }, [conn, stageId, groupId, roundId, tournamentId, enabled, queryClient]);

  return { connected };
}

export default useBRRealtime;
