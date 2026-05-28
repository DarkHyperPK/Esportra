import { useMemo } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { BR_CONFIG } from '@/config/brConfig';
import type { BRRound, BRRoundResult, BRResultInput } from '@/types/brRounds';
import type { BREvidence } from '@/types/battleRoyale';

export const useBRRounds = (
  stageId: string | null,
  groupId: string | null,
  options?: { realtimeConnected?: boolean },
) => {
  const realtimeConnected = options?.realtimeConnected ?? false;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateRoundQueries = async (roundId?: string | null) => {
    await queryClient.invalidateQueries({ queryKey: ['br-rounds', stageId, groupId] });
    if (stageId && groupId) {
      await queryClient.invalidateQueries({ queryKey: ['br-group-leaderboard', stageId, groupId] });
    }
    if (roundId) {
      await queryClient.invalidateQueries({ queryKey: ['br-round-results', roundId] });
      await queryClient.invalidateQueries({ queryKey: ['br-round-evidence', roundId] });
    }
    await queryClient.invalidateQueries({ queryKey: ['br-player-context'] });
  };

  const { data: rounds, isLoading, error, refetch } = useQuery({
    queryKey: ['br-rounds', stageId, groupId],
    queryFn: () =>
      apiClient.get<BRRound[]>(
        `/api/stages/${stageId}/br/groups/${groupId}/rounds`
      ),
    enabled: !!stageId && !!groupId,
    staleTime: 1000 * 60,
    refetchInterval: (query) => {
      if (realtimeConnected) return false;
      const data = query.state.data;
      if (!Array.isArray(data)) return false;
      const needsLiveUpdates = data.some(
        (round) => round.status === 'active' || (round.pending_evidence_count ?? 0) > 0
      );
      return needsLiveUpdates ? 60_000 : false;
    },
    refetchIntervalInBackground: false,
  });

  const createRound = useMutation({
    mutationFn: (params: { lobbyCode?: string; scheduledAt?: string; queueTimerMinutes?: number | null }) =>
      apiClient.post<BRRound>(
        `/api/stages/${stageId}/br/groups/${groupId}/rounds`,
        params
      ),
    onSuccess: async (data) => {
      await invalidateRoundQueries(data.id);
      toast({ title: `Round ${data.round_number} created` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create round', description: error.message, variant: 'destructive' });
    },
  });

  const updateRound = useMutation({
    mutationFn: (params: { roundId: string; lobbyCode?: string | null; status?: string; scheduledAt?: string | null; queueTimerMinutes?: number | null }) => {
      const { roundId, ...body } = params;
      return apiClient.patch<BRRound>(`/api/br/rounds/${roundId}`, body);
    },
    onSuccess: async (data) => {
      await invalidateRoundQueries(data.id);
      const action = data.status === 'active' ? 'started' : data.status === 'completed' ? 'completed' : 'updated';
      toast({ title: `Round ${data.round_number} ${action}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update round', description: error.message, variant: 'destructive' });
    },
  });

  const resetRound = useMutation({
    mutationFn: (params: { roundId: string; roundNumber: number }) =>
      apiClient.post<BRRound>(`/api/br/rounds/${params.roundId}/reset`, {}),
    onSuccess: async (data, variables) => {
      await invalidateRoundQueries(data.id ?? variables.roundId);
      toast({
        title: `Round ${variables.roundNumber} reset`,
        description: 'Lobby code, schedule, queue timer, results, and evidence were cleared.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to reset round', description: error.message, variant: 'destructive' });
    },
  });

  return {
    rounds: rounds ?? [],
    isLoading,
    error,
    refetch,
    createRound,
    updateRound,
    resetRound,
  };
};

export const useBRRoundResults = (roundId: string | null, stageId?: string | null, groupId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: results, isLoading, error, refetch } = useQuery({
    queryKey: ['br-round-results', roundId],
    queryFn: () => apiClient.get<BRRoundResult[]>(`/api/br/rounds/${roundId}/results`),
    enabled: !!roundId,
    staleTime: BR_CONFIG.ROUNDS_STALE_TIME_MS,
  });

  const submitResults = useMutation({
    mutationFn: (params: { roundId: string; results: BRResultInput[] }) =>
      apiClient.put<{ saved: number }>(`/api/br/rounds/${params.roundId}/results`, {
        results: params.results,
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['br-round-results', variables.roundId] });
      if (stageId && groupId) {
        queryClient.invalidateQueries({ queryKey: ['br-rounds', stageId, groupId] });
        queryClient.invalidateQueries({ queryKey: ['br-group-leaderboard', stageId, groupId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['br-rounds'] });
      }
      toast({ title: `${data.saved} results saved` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save results', description: error.message, variant: 'destructive' });
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

export const useBRCompletedRoundResults = (rounds: BRRound[], enabled = true) => {
  const completedRounds = useMemo(
    () => rounds
      .filter((round) => round.status === 'completed')
      .sort((a, b) => a.round_number - b.round_number),
    [rounds],
  );

  const queries = useQueries({
    queries: completedRounds.map((round) => ({
      queryKey: ['br-round-results', round.id],
      queryFn: () => apiClient.get<BRRoundResult[]>(`/api/br/rounds/${round.id}/results`),
      enabled,
      staleTime: BR_CONFIG.ROUNDS_STALE_TIME_MS,
    })),
  });

  const resultsByRoundNumber = useMemo(() => {
    const resultMap = new Map<number, BRRoundResult[]>();

    completedRounds.forEach((round, index) => {
      resultMap.set(round.round_number, queries[index]?.data ?? []);
    });

    return resultMap;
  }, [completedRounds, queries]);

  return {
    completedRounds,
    resultsByRoundNumber,
    isLoading: queries.some((query) => query.isLoading),
  };
};

export const useBRRoundEvidence = (
  roundId: string | null,
  stageId?: string | null,
  groupId?: string | null,
  options?: { realtimeConnected?: boolean },
) => {
  const realtimeConnected = options?.realtimeConnected ?? false;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: evidence, isLoading, error, refetch } = useQuery({
    queryKey: ['br-round-evidence', roundId],
    queryFn: () => apiClient.get<BREvidence[]>(`/api/br/rounds/${roundId}/evidence`),
    enabled: !!roundId,
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
    await queryClient.invalidateQueries({ queryKey: ['br-round-evidence', roundId] });
    if (stageId && groupId) {
      await queryClient.invalidateQueries({ queryKey: ['br-rounds', stageId, groupId] });
    }
  };

  const submitEvidenceMutation = useMutation({
    mutationFn: async (payload: { imageUrl: string; imagePath?: string; placement?: number | null; kills?: number | null }) => {
      if (!roundId) throw new Error('No round selected');
      return apiClient.put<{ success: boolean }>(`/api/br/rounds/${roundId}/evidence`, payload);
    },
    onSuccess: async () => {
      await invalidateRelatedQueries();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to submit evidence', description: error.message, variant: 'destructive' });
    },
  });

  const markReviewedMutation = useMutation({
    mutationFn: async (payload: { entityId: string; reviewed: boolean }) => {
      if (!roundId) throw new Error('No round selected');
      return apiClient.patch<{ success: boolean }>(
        `/api/br/rounds/${roundId}/evidence/${payload.entityId}`,
        { reviewed: payload.reviewed }
      );
    },
    onSuccess: async (_data, variables) => {
      await invalidateRelatedQueries();
      toast({ title: variables.reviewed ? 'Evidence reviewed' : 'Evidence reopened' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update evidence', description: error.message, variant: 'destructive' });
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
