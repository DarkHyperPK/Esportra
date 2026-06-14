import { useMemo } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { BR_CONFIG } from '@/config/brConfig';
import type { BRRound, BRRoundResult, BRResultInput } from '@/types/brLobbies';
import type { BREvidence } from '@/types/battleRoyale';
import type { BRGroup } from '@/types/brGroups';

const withRoundAlias = (lobby: BRRound): BRRound => ({
  ...lobby,
  round_number: lobby.round_number ?? lobby.wave_number,
});

export const useBRLobbies = (
  stageId: string | null,
  groupId: string | null,
  options?: { realtimeConnected?: boolean },
) => {
  const realtimeConnected = options?.realtimeConnected ?? false;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateLobbyQueries = async (lobbyId?: string | null) => {
    await queryClient.invalidateQueries({ queryKey: ['br-lobbies', stageId, groupId] });
    if (stageId && groupId) {
      await queryClient.invalidateQueries({ queryKey: ['br-group-leaderboard', stageId, groupId] });
    }
    if (stageId) {
      await queryClient.invalidateQueries({ queryKey: ['br-stage-leaderboard', stageId] });
    }
    if (lobbyId) {
      await queryClient.invalidateQueries({ queryKey: ['br-lobby-results', lobbyId] });
      await queryClient.invalidateQueries({ queryKey: ['br-lobby-evidence', lobbyId] });
    }
    await queryClient.invalidateQueries({ queryKey: ['br-player-context'] });
  };

  const { data: lobbies, isLoading, error, refetch } = useQuery({
    queryKey: ['br-lobbies', stageId, groupId],
    queryFn: async () => {
      const data = groupId
        ? await apiClient.get<BRRound[]>(`/api/stages/${stageId}/br/groups/${groupId}/lobbies`)
        : await apiClient.get<BRRound[]>(`/api/stages/${stageId}/br/lobbies`);
      return data.map(withRoundAlias);
    },
    enabled: !!stageId,
    staleTime: 1000 * 60,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (realtimeConnected) return 60_000;
      if (!Array.isArray(data)) return false;
      const needsLiveUpdates = data.some(
        (lobby) => lobby.status === 'active' || (lobby.pending_evidence_count ?? 0) > 0,
      );
      return needsLiveUpdates ? 30_000 : false;
    },
    refetchIntervalInBackground: false,
  });

  const createLobby = useMutation({
    mutationFn: (params: { lobbyCode?: string; scheduledAt?: string; queueTimerMinutes?: number | null; map?: string | null }) =>
      apiClient.post<BRRound>(
        `/api/stages/${stageId}/br/groups/${groupId}/lobbies`,
        params,
      ),
    onSuccess: async (data) => {
      await invalidateLobbyQueries(data.id);
      toast({ title: `Lobby ${data.wave_number} created` });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to create lobby',
        description: getApiErrorMessage(error, { context: 'brLobbyCreate' }),
        variant: 'destructive',
      });
    },
  });

  const updateLobby = useMutation({
    mutationFn: (params: {
      lobbyId: string;
      lobbyCode?: string | null;
      status?: string;
      scheduledAt?: string | null;
      queueTimerMinutes?: number | null;
      map?: string | null;
    }) => {
      const { lobbyId, ...body } = params;
      return apiClient.patch<BRRound>(`/api/br/lobbies/${lobbyId}`, body);
    },
    onSuccess: async (data, variables) => {
      await invalidateLobbyQueries(data.id);
      const isCodeOnlyUpdate =
        variables.lobbyCode !== undefined
        && variables.status === undefined
        && variables.scheduledAt === undefined
        && variables.queueTimerMinutes === undefined
        && variables.map === undefined;
      if (isCodeOnlyUpdate) return;
      const action = data.status === 'active' && variables.status === 'active'
        ? 'started'
        : data.status === 'completed' && variables.status === 'completed'
          ? 'completed'
          : 'updated';
      toast({ title: `Lobby ${data.wave_number} ${action}` });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to update lobby',
        description: getApiErrorMessage(error, { context: 'brLobbyUpdate' }),
        variant: 'destructive',
      });
    },
  });

  const resetLobby = useMutation({
    mutationFn: (params: { lobbyId: string; roundNumber: number }) =>
      apiClient.post<BRRound>(`/api/br/lobbies/${params.lobbyId}/reset`, {}),
    onSuccess: async (data, variables) => {
      await invalidateLobbyQueries(data.id ?? variables.lobbyId);
      toast({
        title: `Lobby ${variables.roundNumber} reset`,
        description: 'Lobby code, schedule, queue timer, results, and evidence were cleared.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to reset lobby',
        description: getApiErrorMessage(error, { context: 'brLobbyReset' }),
        variant: 'destructive',
      });
    },
  });

  return {
    lobbies: lobbies ?? [],
    rounds: lobbies ?? [],
    isLoading,
    error,
    refetch,
    createLobby,
    updateLobby,
    resetLobby,
  };
};

export const useBRLobbyResults = (
  lobbyId: string | null,
  stageId?: string | null,
  groupId?: string | null,
  options?: { gameNumber?: number },
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const gameNumber = options?.gameNumber;

  const { data: results, isLoading, error, refetch } = useQuery({
    queryKey: ['br-lobby-results', lobbyId, gameNumber],
    queryFn: () => {
      const suffix = gameNumber != null ? `?gameNumber=${gameNumber}` : '';
      return apiClient.get<BRRoundResult[]>(`/api/br/lobbies/${lobbyId}/results${suffix}`);
    },
    enabled: !!lobbyId,
    staleTime: BR_CONFIG.ROUNDS_STALE_TIME_MS,
  });

  const submitResults = useMutation({
    mutationFn: (params: { lobbyId: string; gameNumber?: number; results: BRResultInput[] }) =>
      apiClient.put<{ saved: number }>(`/api/br/lobbies/${params.lobbyId}/results`, {
        gameNumber: params.gameNumber,
        results: params.results,
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['br-lobby-results', variables.lobbyId] });
      if (stageId && groupId) {
        queryClient.invalidateQueries({ queryKey: ['br-lobbies', stageId, groupId] });
        queryClient.invalidateQueries({ queryKey: ['br-group-leaderboard', stageId, groupId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['br-lobbies'] });
      }
      if (stageId) {
        queryClient.invalidateQueries({ queryKey: ['br-stage-leaderboard', stageId] });
      }
      toast({ title: `${data.saved} results saved` });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to save results',
        description: getApiErrorMessage(error, { context: 'brResults' }),
        variant: 'destructive',
      });
    },
  });

  return {
    results: results ?? [],
    isLoading,
    error,
    refetch,
    submitResults,
  };
};

export const useBRCompletedLobbyResults = (lobbies: BRRound[], enabled = true) => {
  const completedRounds = useMemo(
    () => lobbies
      .filter((lobby) => lobby.status === 'completed')
      .sort((a, b) => (a.round_number ?? a.wave_number) - (b.round_number ?? b.wave_number)),
    [lobbies],
  );

  const gameQueries = useQueries({
    queries: completedRounds.map((lobby) => ({
      queryKey: ['br-lobby-games', lobby.id],
      queryFn: () => apiClient.get<{ id: string; game_number: number; status: string }[]>(
        `/api/lobbies/${lobby.id}/games`,
      ),
      enabled,
      staleTime: BR_CONFIG.ROUNDS_STALE_TIME_MS,
    })),
  });

  const completedGameSlots = useMemo(() => {
    const slots: { lobby: BRRound; gameNumber: number }[] = [];
    completedRounds.forEach((lobby, index) => {
      const games = gameQueries[index]?.data ?? [];
      const completedGames = games.filter((game) => game.status === 'completed');
      if (completedGames.length > 0) {
        for (const game of completedGames) {
          slots.push({ lobby, gameNumber: game.game_number });
        }
        return;
      }
      slots.push({ lobby, gameNumber: 1 });
    });
    return slots;
  }, [completedRounds, gameQueries]);

  const resultQueries = useQueries({
    queries: completedGameSlots.map(({ lobby, gameNumber }) => ({
      queryKey: ['br-lobby-results', lobby.id, gameNumber],
      queryFn: () => apiClient.get<BRRoundResult[]>(
        `/api/br/lobbies/${lobby.id}/results?gameNumber=${gameNumber}`,
      ),
      enabled,
      staleTime: BR_CONFIG.ROUNDS_STALE_TIME_MS,
    })),
  });

  const resultsByRoundNumber = useMemo(() => {
    const resultMap = new Map<number, BRRoundResult[]>();
    completedGameSlots.forEach((slot, index) => {
      const lobbyOrdinal = slot.lobby.round_number ?? slot.lobby.wave_number;
      const key = slot.gameNumber > 1
        ? lobbyOrdinal * 100 + slot.gameNumber
        : lobbyOrdinal;
      resultMap.set(key, resultQueries[index]?.data ?? []);
    });
    return resultMap;
  }, [completedGameSlots, resultQueries]);

  return {
    completedRounds,
    completedGameSlots,
    resultsByRoundNumber,
    isLoading: gameQueries.some((query) => query.isLoading)
      || resultQueries.some((query) => query.isLoading),
  };
};

export const useBRLobbyEvidence = (
  lobbyId: string | null,
  stageId?: string | null,
  groupId?: string | null,
  options?: { realtimeConnected?: boolean; gameNumber?: number; gameId?: string | null; enabled?: boolean },
) => {
  const realtimeConnected = options?.realtimeConnected ?? false;
  const enabled = options?.enabled ?? true;
  const gameNumber = options?.gameNumber;
  const gameId = options?.gameId;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: evidence, isLoading, error, refetch } = useQuery({
    queryKey: ['br-lobby-evidence', lobbyId, gameNumber, gameId],
    queryFn: () => {
      if (gameId) {
        return apiClient.get<BREvidence[]>(`/api/br/games/${gameId}/evidence`);
      }
      const suffix = gameNumber != null ? `?gameNumber=${gameNumber}` : '';
      return apiClient.get<BREvidence[]>(`/api/br/lobbies/${lobbyId}/evidence${suffix}`);
    },
    enabled: enabled && (!!lobbyId || !!gameId),
    staleTime: BR_CONFIG.ROUNDS_STALE_TIME_MS,
    refetchInterval: (query) => {
      if (realtimeConnected) return false;
      const data = query.state.data;
      if (!Array.isArray(data)) return 15_000;
      const hasPendingReview = data.some((item) => !item.reviewed);
      return hasPendingReview ? 15_000 : 30_000;
    },
    refetchIntervalInBackground: false,
  });

  const invalidateRelatedQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['br-lobby-evidence', lobbyId, gameNumber, gameId] });
    if (stageId && groupId) {
      await queryClient.invalidateQueries({ queryKey: ['br-lobbies', stageId, groupId] });
    }
  };

  const submitEvidenceMutation = useMutation({
    mutationFn: async (payload: { imageUrl: string; imagePath?: string; placement?: number | null; kills?: number | null; gameNumber?: number }) => {
      if (gameId) {
        return apiClient.put<{ success: boolean }>(`/api/br/games/${gameId}/evidence`, payload);
      }
      if (!lobbyId) throw new Error('No lobby selected');
      return apiClient.put<{ success: boolean }>(`/api/br/lobbies/${lobbyId}/evidence`, {
        ...payload,
        gameNumber: payload.gameNumber ?? gameNumber,
      });
    },
    onSuccess: async () => {
      await invalidateRelatedQueries();
    },
  });

  const markReviewedMutation = useMutation({
    mutationFn: async (payload: { entityId: string; reviewed: boolean; gameNumber?: number }) => {
      if (!lobbyId) throw new Error('No lobby selected');
      const suffix = (payload.gameNumber ?? gameNumber) != null
        ? `?gameNumber=${payload.gameNumber ?? gameNumber}`
        : '';
      return apiClient.patch<{ success: boolean }>(
        `/api/br/lobbies/${lobbyId}/evidence/${payload.entityId}${suffix}`,
        { reviewed: payload.reviewed },
      );
    },
    onSuccess: async (_data, variables) => {
      await invalidateRelatedQueries();
      toast({ title: variables.reviewed ? 'Evidence reviewed' : 'Evidence reopened' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to update evidence',
        description: getApiErrorMessage(error, { context: 'brEvidence' }),
        variant: 'destructive',
      });
    },
  });

  return {
    evidence: evidence ?? [],
    isLoading,
    error,
    refetch,
    submitEvidence: submitEvidenceMutation.mutateAsync,
    markReviewed: markReviewedMutation.mutateAsync,
    isSubmitting: submitEvidenceMutation.isPending,
    isUpdating: markReviewedMutation.isPending,
  };
};

/** Full lobby rows for rotation stages — single stage-level fetch (deduped by lobby id). */
export function useStageLobbiesDeduped(
  stageId: string | null,
  groups: BRGroup[],
  options?: { realtimeJoined?: boolean },
) {
  const realtimeJoined = options?.realtimeJoined ?? false;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['br-lobbies', stageId, 'stage-all'],
    queryFn: async () => {
      const rows = await apiClient.get<BRRound[]>(`/api/stages/${stageId}/br/lobbies`);
      return (Array.isArray(rows) ? rows : []).map(withRoundAlias);
    },
    enabled: Boolean(stageId && groups.length > 0),
    staleTime: 1000 * 60,
    refetchInterval: Boolean(stageId && groups.length > 0)
      ? (realtimeJoined ? 60_000 : 30_000)
      : false,
    refetchIntervalInBackground: Boolean(stageId && groups.length > 0),
  });

  const lobbies = useMemo(() => {
    const list = data ?? [];
    return [...list].sort(
      (a, b) =>
        (a.wave_number ?? a.round_number ?? 0) - (b.wave_number ?? b.round_number ?? 0)
        || (a.lobby_index ?? 0) - (b.lobby_index ?? 0),
    );
  }, [data]);

  return {
    lobbies,
    isLoading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
