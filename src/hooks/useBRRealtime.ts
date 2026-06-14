/**
 * useBRRealtime — live BR lobby/evidence/leaderboard updates via SignalR BRHub.
 * Invalidates TanStack Query caches on hub events; does not push full state.
 */

import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useHub } from '@/hooks/useSignalR';
import { useHubGroupJoin } from '@/hooks/useHubGroupJoin';
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
  const isEnabled = enabled && Boolean(stageId || groupId || effectiveLobbyId);

  const joinGroups = useCallback(async () => {
    await Promise.all([
      stageId ? conn.invoke('JoinStage', stageId) : Promise.resolve(),
      groupId ? conn.invoke('JoinGroup', groupId) : Promise.resolve(),
      effectiveLobbyId ? conn.invoke('JoinLobby', effectiveLobbyId) : Promise.resolve(),
    ]);
  }, [conn, stageId, groupId, effectiveLobbyId]);

  const leaveGroups = useCallback(async () => {
    await Promise.all([
      effectiveLobbyId ? conn.invoke('LeaveLobby', effectiveLobbyId) : Promise.resolve(),
      groupId ? conn.invoke('LeaveGroup', groupId) : Promise.resolve(),
      stageId ? conn.invoke('LeaveStage', stageId) : Promise.resolve(),
    ]);
  }, [conn, stageId, groupId, effectiveLobbyId]);

  const { joined } = useHubGroupJoin(conn, {
    enabled: isEnabled,
    join: joinGroups,
    leave: leaveGroups,
    onJoinError: (error) => {
      if (import.meta.env.DEV) {
        console.warn('[BRRealtime] Failed to join stream', error);
      }
    },
  });

  useEffect(() => {
    if (!isEnabled) return;

    let active = true;
    const scope = { stageId, groupId, lobbyId: effectiveLobbyId };

    const invalidateLobbies = () => {
      if (stageId && groupId) {
        queryClient.invalidateQueries({ queryKey: ['br-lobbies', stageId, groupId] });
      } else if (stageId) {
        queryClient.invalidateQueries({ queryKey: ['br-lobbies', stageId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['br-lobbies'] });
      }
      if (stageId) {
        queryClient.invalidateQueries({ queryKey: ['br-lobbies', stageId, 'stage-all'] });
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
      queryClient.invalidateQueries({ queryKey: ['br-lobby-readiness', payload.lobbyId] });
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

    const handleLobbyReadinessUpdated = (payload: BrScopedPayload) => {
      if (!active || !matchesScope(payload, scope)) return;
      queryClient.invalidateQueries({ queryKey: ['br-lobby-readiness', payload.lobbyId] });
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
    conn.on('LobbyReadinessUpdated', handleLobbyReadinessUpdated);
    conn.on('ResultsUpdated', handleResultsUpdated);
    conn.on('LeaderboardUpdated', handleLeaderboardUpdated);

    return () => {
      active = false;
      conn.off('LobbyCreated', handleLobbyCreated);
      conn.off('LobbyUpdated', handleLobbyUpdated);
      conn.off('LobbyReset', handleLobbyReset);
      conn.off('LobbyCompleted', handleLobbyUpdated);
      conn.off('GameUpdated', handleGameUpdated);
      conn.off('GameCompleted', handleGameUpdated);
      conn.off('EvidenceSubmitted', handleEvidenceSubmitted);
      conn.off('EvidenceReviewed', handleEvidenceReviewed);
      conn.off('LobbyReadinessUpdated', handleLobbyReadinessUpdated);
      conn.off('ResultsUpdated', handleResultsUpdated);
      conn.off('LeaderboardUpdated', handleLeaderboardUpdated);
    };
  }, [
    conn,
    stageId,
    groupId,
    effectiveLobbyId,
    tournamentId,
    isEnabled,
    queryClient,
  ]);

  return { connected: joined, joined };
}

export default useBRRealtime;
