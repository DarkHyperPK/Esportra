import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import type { BRGroup, BRGroupTeam, BRDistributionMethod } from '@/types/brGroups';

export const useBRGroups = (stageId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: groups, isLoading, error, refetch } = useQuery({
    queryKey: ['br-groups', stageId],
    queryFn: () => apiClient.get<BRGroup[]>(`/api/stages/${stageId}/br/groups`),
    enabled: !!stageId,
    staleTime: 1000 * 60 * 2,
  });

  const createGroups = useMutation({
    mutationFn: (params: { groupCount: number; lobbySize: number; force?: boolean }) =>
      apiClient.post<BRGroup[]>(`/api/stages/${stageId}/br/groups`, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['br-groups', stageId] });
      queryClient.invalidateQueries({ queryKey: ['br-group-teams', stageId] });
      queryClient.invalidateQueries({ queryKey: ['br-groups-detail', stageId] });
      toast({ title: 'Groups created' });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      const msg = message.toLowerCase().includes('force') || message.toLowerCase().includes('existing round')
        ? 'Groups have existing rounds. Delete all rounds first, or enable "Force recreate" to override.'
        : message;
      toast({ title: 'Failed to create groups', description: msg, variant: 'destructive' });
    },
  });

  const assignTeams = useMutation({
    mutationFn: (params: { method: BRDistributionMethod }) =>
      apiClient.post<{ assigned: number; groups: number }>(
        `/api/stages/${stageId}/br/groups/assign`,
        params
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['br-groups', stageId] });
      queryClient.invalidateQueries({ queryKey: ['br-group-teams', stageId] });
      // Also invalidate the batch-fetch key used by BRStageGroupSection
      queryClient.invalidateQueries({ queryKey: ['br-groups-detail', stageId] });
      toast({ title: `${data.assigned} teams distributed across ${data.groups} groups` });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to distribute teams',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: (groupId: string) =>
      apiClient.delete(`/api/stages/${stageId}/br/groups/${groupId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['br-groups', stageId] });
      queryClient.invalidateQueries({ queryKey: ['br-groups-detail', stageId] });
      toast({ title: 'Group deleted' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete group',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateGroupTeams = useMutation({
    mutationFn: (params: { groupId: string; teamIds: string[] }) =>
      apiClient.put<{ assigned: number }>(
        `/api/stages/${stageId}/br/groups/${params.groupId}/teams`,
        { teamIds: params.teamIds }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['br-groups', stageId] });
      queryClient.invalidateQueries({ queryKey: ['br-group-teams', stageId] });
      queryClient.invalidateQueries({ queryKey: ['br-groups-detail', stageId] });
      toast({ title: 'Group teams updated' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update teams',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    groups: groups ?? [],
    isLoading,
    error,
    refetch,
    createGroups,
    assignTeams,
    deleteGroup,
    updateGroupTeams,
  };
};

export const useBRGroupTeams = (stageId: string | null, groupId: string | null) => {
  return useQuery({
    queryKey: ['br-group-teams', stageId, groupId],
    queryFn: () =>
      apiClient.get<BRGroupTeam[]>(
        `/api/stages/${stageId}/br/groups/${groupId}/teams`
      ),
    enabled: !!stageId && !!groupId,
    staleTime: 1000 * 60 * 2,
  });
};
