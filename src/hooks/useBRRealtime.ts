/**
 * useBRRealtime — live BR lobby/evidence/leaderboard updates via SignalR BRHub.
 * Invalidates TanStack Query caches on hub events; does not push full state.
 */

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HubConnectionState } from '@microsoft/signalr';
import { useHub } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';

interface BrEventScope {
  stageId?: string | null;
  groupId?: string | null;
  lobbyId?: string | null;
}

interface UseBRRealtimeOptions extends BrEventScope {
  roundId?: string | null;
  tournamentId?: string | null;
  enabled?: boolean;
}

interface BrScopedPayload extends BrEventScope {
  lobbyId?: string;
  gameId?: string;
}

const matchesScope = (payload: BrScopedPayload, scope: BrEventScope) => {
  if (scope.stageId && payload.stageId && payload.stageId !== scope.stageId) return false;
  // Lobby events (code updates, reset, etc.) apply to all groups sharing this lobby.
  if (scope.lobbyId && payload.lobbyId && payload.lobbyId === scope.lobbyId) return true;
  if (scope.groupId && payload.groupId && payload.groupId !== scope.groupId) return false;
  if (scope.lobbyId && payload.lobbyId && payload.lobbyId !== scope.lobbyId) return false;
  return true;
};

export function useBRRealtime({
  stageId,
  groupId,
  lobbyId,
  roundId,
  tournamentId,
  enabled = true,
}: UseBRRealtimeOptions) {
  const effectiveLobbyId = lobbyId ?? roundId ?? null;
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
    const scope = { stageId, groupId, lobbyId: effectiveLobbyId };

    const invalidateLobbies = () => {
      if (stageId) {
        queryClient.invalidateQueries({ queryKey: ['br-lobbies', stageId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['br-lobbies'] });
      }
    };

    const invalidateLobbyResults = (targetLobbyId?: string | null) => {
      const id = targetLobbyId ?? effectiveLobbyId;
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['br-lobby-results', id] });
      }
    };

    const invalidateLobbyEvidence = (targetLobbyId?: string | null) => {
      const id = targetLobbyId ?? effectiveLobbyId;
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['br-lobby-evidence', id] });
      }
    };

    const invalidateLeaderboard = () => {
      if (stageId && groupId) {
        queryClient.invalidateQueries({ queryKey: ['br-group-leaderboard', stageId, groupId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['br-group-leaderboard'] });
      }
      if (stageId) {
        queryClient.invalidateQueries({ queryKey: ['br-stage-leaderboard', stageId] });
      }
    };

    const invalidateStageCompletion = () => {
      if (stageId) {
        queryClient.invalidateQueries({ queryKey: ['stage-completion', stageId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['stage-completion'] });
      }
    };

    const invalidatePlayerContext = () => {
      if (tournamentId) {
        queryClient.invalidateQueries({ queryKey: ['br-player-context', tournamentId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['br-player-context'] });
      }
    };

    const invalidateGames = (targetLobbyId?: string | null) => {
      const id = targetLobbyId ?? effectiveLobbyId;
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['br-games', id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['br-games'] });
      }
    };

    const handleGameUpdated = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateGames(payload.lobbyId);
      invalidateLobbies();
      invalidatePlayerContext();
      invalidateLeaderboard();
      invalidateStageCompletion();
    };

    const handleLobbyCreated = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateLobbies();
      invalidatePlayerContext();
    };

    const handleLobbyUpdated = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateLobbies();
      invalidateGames(payload.lobbyId);
      invalidatePlayerContext();
      invalidateLeaderboard();
      invalidateStageCompletion();
    };

    const handleLobbyReset = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateLobbies();
      invalidateGames(payload.lobbyId);
      invalidateLobbyResults(payload.lobbyId);
      invalidateLobbyEvidence(payload.lobbyId);
      invalidateLeaderboard();
      invalidatePlayerContext();
      invalidateStageCompletion();
    };

    const handleEvidenceSubmitted = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateLobbyEvidence(payload.lobbyId);
      invalidateLobbies();
    };

    const handleEvidenceReviewed = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateLobbyEvidence(payload.lobbyId);
      invalidateLobbies();
    };

    const handleResultsUpdated = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateLobbyResults(payload.lobbyId);
      invalidateLobbies();
      invalidateLeaderboard();
      invalidateStageCompletion();
    };

    const handleLeaderboardUpdated = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      invalidateLeaderboard();
      invalidateStageCompletion();
    };

    conn.on('LobbyCreated', handleLobbyCreated);
    conn.on('LobbyUpdated', handleLobbyUpdated);
    conn.on('LobbyReset', handleLobbyReset);
    conn.on('LobbyCompleted', handleLobbyUpdated);
    conn.on('GameUpdated', handleGameUpdated);
    conn.on('GameCompleted', handleGameUpdated);
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
          effectiveLobbyId ? conn.invoke('JoinLobby', effectiveLobbyId) : Promise.resolve(),
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
      conn.off('LobbyCreated', handleLobbyCreated);
      conn.off('LobbyUpdated', handleLobbyUpdated);
      conn.off('LobbyReset', handleLobbyReset);
      conn.off('LobbyCompleted', handleLobbyUpdated);
      conn.off('GameUpdated', handleGameUpdated);
      conn.off('GameCompleted', handleGameUpdated);
      conn.off('EvidenceSubmitted', handleEvidenceSubmitted);
      conn.off('EvidenceReviewed', handleEvidenceReviewed);
      conn.off('ResultsUpdated', handleResultsUpdated);
      conn.off('LeaderboardUpdated', handleLeaderboardUpdated);

      if (conn.state === HubConnectionState.Connected) {
        if (effectiveLobbyId) conn.invoke('LeaveLobby', effectiveLobbyId).catch(() => {});
        if (groupId) conn.invoke('LeaveGroup', groupId).catch(() => {});
        if (stageId) conn.invoke('LeaveStage', stageId).catch(() => {});
      }
    };
  }, [conn, stageId, groupId, effectiveLobbyId, tournamentId, enabled, queryClient]);

  return { connected };
}

export default useBRRealtime;
