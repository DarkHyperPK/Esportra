import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { BR_CONFIG } from '@/config/brConfig';

export interface BRLobbyReadinessEntry {
  userId: string;
  displayName: string;
  teamId?: string | null;
  participantId?: string | null;
  checkedInAt: string;
}

export interface BRLobbyReadinessResponse {
  readyCount: number;
  totalAssigned: number;
  isReady: boolean;
  entries?: BRLobbyReadinessEntry[] | null;
}

export function useBRLobbyReadiness(
  lobbyId: string | null,
  options?: { enabled?: boolean; realtimeConnected?: boolean },
) {
  const enabled = Boolean(lobbyId) && (options?.enabled ?? true);
  const realtimeConnected = options?.realtimeConnected ?? false;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['br-lobby-readiness', lobbyId],
    queryFn: () => apiClient.get<BRLobbyReadinessResponse>(`/api/br/lobbies/${lobbyId}/readiness`),
    enabled,
    staleTime: BR_CONFIG.ROUNDS_STALE_TIME_MS,
    refetchInterval: realtimeConnected ? false : 15_000,
    refetchIntervalInBackground: false,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['br-lobby-readiness', lobbyId] });
  };

  const checkInMutation = useMutation({
    mutationFn: () => apiClient.post<{ success: boolean }>(`/api/br/lobbies/${lobbyId}/readiness`, {}),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (err: unknown) => {
      toast({
        title: 'Check-in failed',
        description: getApiErrorMessage(err, { context: 'checkIn' }),
        variant: 'destructive',
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/br/lobbies/${lobbyId}/readiness`),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (err: unknown) => {
      toast({
        title: 'Could not undo check-in',
        description: getApiErrorMessage(err, { context: 'checkIn' }),
        variant: 'destructive',
      });
    },
  });

  return {
    readiness: data,
    readyCount: data?.readyCount ?? 0,
    totalAssigned: data?.totalAssigned ?? 0,
    isReady: data?.isReady ?? false,
    entries: data?.entries ?? [],
    isLoading,
    error,
    refetch,
    checkIn: checkInMutation.mutateAsync,
    checkOut: checkOutMutation.mutateAsync,
    isCheckingIn: checkInMutation.isPending || checkOutMutation.isPending,
  };
}
