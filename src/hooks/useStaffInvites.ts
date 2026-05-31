import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPendingStaffInvites,
  respondToStaffInvite,
} from '@/lib/tournamentStaff';

export function useStaffInvites(userId?: string) {
  const queryClient = useQueryClient();

  const { data: invites = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['staff-invites'],
    queryFn: () => fetchPendingStaffInvites(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

  const respondMutation = useMutation({
    mutationFn: ({ inviteId, accept }: { inviteId: string; accept: boolean }) =>
      respondToStaffInvite({ inviteId, accept }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invites'] });
    },
  });

  const refresh = useCallback(async () => { await refetch(); }, [refetch]);

  const respond = useCallback(
    async (inviteId: string, accept: boolean) => {
      await respondMutation.mutateAsync({ inviteId, accept });
    },
    [respondMutation]
  );

  return {
    invites,
    loading,
    error,
    refresh,
    respond,
  };
}

