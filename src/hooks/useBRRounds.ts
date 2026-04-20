import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import type { BRRound, BRRoundResult, BRResultInput } from '@/types/brRounds';

export const useBRRounds = (stageId: string | null, groupId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rounds, isLoading, error, refetch } = useQuery({
    queryKey: ['br-rounds', stageId, groupId],
    queryFn: () =>
      apiClient.get<BRRound[]>(
        `/api/stages/${stageId}/br/groups/${groupId}/rounds`
      ),
    enabled: !!stageId && !!groupId,
    staleTime: 1000 * 60,
  });

  const createRound = useMutation({
    mutationFn: (params: { lobbyCode?: string; scheduledAt?: string }) =>
      apiClient.post<BRRound>(
        `/api/stages/${stageId}/br/groups/${groupId}/rounds`,
        params
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['br-rounds', stageId, groupId] });
      toast({ title: `Round ${data.round_number} created` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create round', description: error.message, variant: 'destructive' });
    },
  });

  const updateRound = useMutation({
    mutationFn: (params: { roundId: string; lobbyCode?: string | null; status?: string; scheduledAt?: string | null }) => {
      const { roundId, ...body } = params;
      return apiClient.patch<BRRound>(`/api/br/rounds/${roundId}`, body);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['br-rounds', stageId, groupId] });
      const action = data.status === 'active' ? 'started' : data.status === 'completed' ? 'completed' : 'updated';
      toast({ title: `Round ${data.round_number} ${action}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update round', description: error.message, variant: 'destructive' });
    },
  });

  return {
    rounds: rounds ?? [],
    isLoading,
    error,
    refetch,
    createRound,
    updateRound,
  };
};

export const useBRRoundResults = (roundId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: results, isLoading, error, refetch } = useQuery({
    queryKey: ['br-round-results', roundId],
    queryFn: () => apiClient.get<BRRoundResult[]>(`/api/br/rounds/${roundId}/results`),
    enabled: !!roundId,
    staleTime: 1000 * 30,
  });

  const submitResults = useMutation({
    mutationFn: (params: { roundId: string; results: BRResultInput[] }) =>
      apiClient.put<{ saved: number }>(`/api/br/rounds/${params.roundId}/results`, {
        results: params.results,
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['br-round-results', variables.roundId] });
      queryClient.invalidateQueries({ queryKey: ['br-rounds'] });
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
