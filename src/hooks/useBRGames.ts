import { useMemo } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import type { BRGame, BRScheduleTimesSaveResult } from '@/types/brLobbies';

export const useBRGames = (
  lobbyId: string | null,
  options?: { enabled?: boolean },
) => {
  const enabled = (options?.enabled ?? true) && !!lobbyId;

  return useQuery({
    queryKey: ['br-games', lobbyId],
    queryFn: () => apiClient.get<BRGame[]>(`/api/lobbies/${lobbyId}/games`),
    enabled,
    staleTime: 1000 * 30,
  });
};

/** Games for every lobby id, fetched through the shared `br-games` query cache (deduped, per-lobby). */
export const useBRGamesForLobbies = (lobbyIds: string[]) => {
  const results = useQueries({
    queries: lobbyIds.map((lobbyId) => ({
      queryKey: ['br-games', lobbyId] as const,
      queryFn: () => apiClient.get<BRGame[]>(`/api/lobbies/${lobbyId}/games`),
      staleTime: 1000 * 30,
      enabled: Boolean(lobbyId),
    })),
  });

  const gamesByLobby = useMemo(() => {
    const map: Record<string, BRGame[]> = {};
    lobbyIds.forEach((lobbyId, index) => {
      map[lobbyId] = results[index]?.data ?? [];
    });
    return map;
  }, [lobbyIds, results]);

  const isLoading = results.some((result) => result.isLoading);

  return { gamesByLobby, isLoading };
};

/** Batch-persists game scheduled times and refreshes every query that consumes them. */
export const useSaveBRGameSchedules = (
  stageId?: string | null,
  groupId?: string | null,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      scheduledAtByGame: Record<string, string | null>;
      lobbyIds: string[];
    }): Promise<BRScheduleTimesSaveResult> => {
      const result: BRScheduleTimesSaveResult = { saved: [], failed: 0, firstError: null };
      for (const [gameId, scheduledAt] of Object.entries(params.scheduledAtByGame)) {
        try {
          await apiClient.patch<BRGame>(`/api/br/games/${gameId}`, { scheduledAt });
          result.saved.push(gameId);
        } catch (error) {
          result.failed += 1;
          result.firstError ??= error;
        }
      }
      return result;
    },
    onSuccess: async (result, variables) => {
      if (result.saved.length === 0) return;
      for (const lobbyId of variables.lobbyIds) {
        await queryClient.invalidateQueries({ queryKey: ['br-games', lobbyId] });
      }
      await queryClient.invalidateQueries({ queryKey: ['br-player-context'] });
      if (stageId) {
        await queryClient.invalidateQueries({ queryKey: ['br-lobbies', stageId, groupId ?? null] });
        await queryClient.invalidateQueries({ queryKey: ['br-lobbies', stageId, 'stage-all'] });
        await queryClient.invalidateQueries({ queryKey: ['br-stage-leaderboard', stageId] });
        if (groupId) {
          await queryClient.invalidateQueries({ queryKey: ['br-group-leaderboard', stageId, groupId] });
        }
      }
    },
  });
};

export const useBRGame = (gameId: string | null) =>
  useQuery({
    queryKey: ['br-game', gameId],
    queryFn: () => apiClient.get<BRGame>(`/api/br/games/${gameId}`),
    enabled: !!gameId,
    staleTime: 1000 * 15,
  });

export const useUpdateBRGame = (
  stageId?: string | null,
  groupId?: string | null,
  lobbyId?: string | null,
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      gameId: string;
      map?: string | null;
      status?: 'pending' | 'active' | 'completed';
      scheduledAt?: string | null;
      startedAt?: string | null;
      queueTimerMinutes?: number | null;
    }) => {
      const { gameId, ...body } = params;
      return apiClient.patch<BRGame>(`/api/br/games/${gameId}`, body);
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['br-games', data.lobby_id ?? lobbyId] });
      await queryClient.invalidateQueries({ queryKey: ['br-game', data.id] });
      if (stageId && groupId) {
        await queryClient.invalidateQueries({ queryKey: ['br-lobbies', stageId, groupId] });
        await queryClient.invalidateQueries({ queryKey: ['br-group-leaderboard', stageId, groupId] });
      }
      if (stageId) {
        await queryClient.invalidateQueries({ queryKey: ['br-lobbies', stageId, 'stage-all'] });
        await queryClient.invalidateQueries({ queryKey: ['br-stage-leaderboard', stageId] });
      }
      await queryClient.invalidateQueries({ queryKey: ['br-player-context'] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to update game',
        description: getApiErrorMessage(error, { context: 'brResults' }),
        variant: 'destructive',
      });
    },
  });
};

export const useBRGameResults = (gameId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['br-game-results', gameId],
    queryFn: () => apiClient.get(`/api/br/games/${gameId}/results`),
    enabled: !!gameId,
    staleTime: 1000 * 30,
  });

  const submitResults = useMutation({
    mutationFn: (params: { lobbyId: string; gameNumber: number; results: unknown[] }) =>
      apiClient.put(`/api/br/lobbies/${params.lobbyId}/results`, {
        gameNumber: params.gameNumber,
        results: params.results,
      }),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['br-game-results', gameId] });
      await queryClient.invalidateQueries({ queryKey: ['br-lobby-results', variables.lobbyId] });
      await queryClient.invalidateQueries({ queryKey: ['br-player-context'] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to save results',
        description: getApiErrorMessage(error, { context: 'brResults' }),
        variant: 'destructive',
      });
    },
  });

  return { ...query, submitResults };
};
