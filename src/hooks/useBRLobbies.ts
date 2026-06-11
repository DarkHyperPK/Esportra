import { useMemo } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { BR_CONFIG } from '@/config/brConfig';
import type { BRRound, BRRoundResult, BRResultInput } from '@/types/brLobbies';
import type { BREvidence } from '@/types/battleRoyale';

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
      if (realtimeConnected) return false;
      const data = query.state.data;
      if (!Array.isArray(data)) return false;
      const needsLiveUpdates = data.some(
        (lobby) => lobby.status === 'active' || (lobby.pending_evidence_count ?? 0) > 0,
      );
      return needsLiveUpdates ? 60_000 : false;
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
        description: getApiErrorMessage(error, 'We could not create this lobby. Check the group setup and try again.'),
        variant: 'destructive',
      });
    },
  });

  const updateLobby = useMutation({
    mutationFn: (params: { lobbyId: string; lobbyCode?: string | null; status?: string; scheduledAt?: string | null; queueTimerMinutes?: number | null; map?: string | null }) => {
      const { lobbyId, ...body } = params;
      return apiClient.patch<BRRound>(`/api/br/lobbies/${lobbyId}`, body);
    },
    onSuccess: async (data) => {
      await invalidateLobbyQueries(data.id);
      const action = data.status === 'active' ? 'started' : data.status === 'completed' ? 'completed' : 'updated';
      toast({ title: `Lobby ${data.wave_number} ${action}` });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to update lobby',
        description: getApiErrorMessage(error, 'We could not update this lobby. Check the schedule and try again.'),
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
        description: getApiErrorMessage(error, 'We could not reset this lobby. Please try again.'),
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

export const useBRLobbyResults = (lobbyId: string | null, stageId?: string | null, groupId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: results, isLoading, error, refetch } = useQuery({
    queryKey: ['br-lobby-results', lobbyId],
    queryFn: () => apiClient.get<BRRoundResult[]>(`/api/br/lobbies/${lobbyId}/results`),
    enabled: !!lobbyId,
    staleTime: BR_CONFIG.ROUNDS_STALE_TIME_MS,
  });

  const submitResults = useMutation({
    mutationFn: (params: { lobbyId: string; results: BRResultInput[] }) =>
      apiClient.put<{ saved: number }>(`/api/br/lobbies/${params.lobbyId}/results`, {
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
        description: getApiErrorMessage(error, 'We could not save these results. Check every placement and try again.'),
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

  const queries = useQueries({
    queries: completedRounds.map((lobby) => ({
      queryKey: ['br-lobby-results', lobby.id],
      queryFn: () => apiClient.get<BRRoundResult[]>(`/api/br/lobbies/${lobby.id}/results`),
      enabled,
      staleTime: BR_CONFIG.ROUNDS_STALE_TIME_MS,
    })),
  });

  const resultsByRoundNumber = useMemo(() => {
    const resultMap = new Map<number, BRRoundResult[]>();
    completedRounds.forEach((lobby, index) => {
      resultMap.set(lobby.round_number ?? lobby.wave_number, queries[index]?.data ?? []);
    });
    return resultMap;
  }, [completedRounds, queries]);

  return {
    completedRounds,
    resultsByRoundNumber,
    isLoading: queries.some((query) => query.isLoading),
  };
};

export const useBRLobbyEvidence = (
  lobbyId: string | null,
  stageId?: string | null,
  groupId?: string | null,
  options?: { realtimeConnected?: boolean },
) => {
  const realtimeConnected = options?.realtimeConnected ?? false;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: evidence, isLoading, error, refetch } = useQuery({
    queryKey: ['br-lobby-evidence', lobbyId],
    queryFn: () => apiClient.get<BREvidence[]>(`/api/br/lobbies/${lobbyId}/evidence`),
    enabled: !!lobbyId,
    staleTime: BR_CONFIG.ROUNDS_STALE_TIME_MS,
    refetchInterval: (query) => {
      if (realtimeConnected) return false;
      const data = query.state.data;
      if (!Array.isArray(data)) return false;
      const hasPendingReview = data.some((item) => !item.reviewed);
      return hasPendingReview ? 60_000 : false;
    },
    refetchIntervalInBackground: false,
  });

  const invalidateRelatedQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['br-lobby-evidence', lobbyId] });
    if (stageId && groupId) {
      await queryClient.invalidateQueries({ queryKey: ['br-lobbies', stageId, groupId] });
    }
  };

  const submitEvidenceMutation = useMutation({
    mutationFn: async (payload: { imageUrl: string; imagePath?: string; placement?: number | null; kills?: number | null }) => {
      if (!lobbyId) throw new Error('No lobby selected');
      return apiClient.put<{ success: boolean }>(`/api/br/lobbies/${lobbyId}/evidence`, payload);
    },
    onSuccess: async () => {
      await invalidateRelatedQueries();
    },
  });

  const markReviewedMutation = useMutation({
    mutationFn: async (payload: { entityId: string; reviewed: boolean }) => {
      if (!lobbyId) throw new Error('No lobby selected');
      return apiClient.patch<{ success: boolean }>(
        `/api/br/lobbies/${lobbyId}/evidence/${payload.entityId}`,
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
        description: getApiErrorMessage(error, 'We could not update this evidence review. Please try again.'),
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
