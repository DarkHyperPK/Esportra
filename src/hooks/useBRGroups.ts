import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import type { BRGroup, BRGroupTeam, BRDistributionMethod } from '@/types/brGroups';

// ── Shared invalidation helper ───────────────────────────────────────────────
const invalidateBRGroups = (queryClient: ReturnType<typeof useQueryClient>, stageId: string | null) => {
  queryClient.invalidateQueries({ queryKey: ['br-groups', stageId] });
  queryClient.invalidateQueries({ queryKey: ['br-groups-detail', stageId] });
  queryClient.invalidateQueries({ queryKey: ['br-group-teams', stageId] });
  queryClient.invalidateQueries({ queryKey: ['br-group-participants', stageId] });
};

// ── useBRGroupsMutations ─────────────────────────────────────────────────────
// Mutations only — no list query. Used by BRStageGroupSection alongside
// useBRGroupsDetail so there is a single HTTP request for all group data.
export const useBRGroupsMutations = (stageId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createGroups = useMutation({
    mutationFn: (params: { groupCount: number; lobbySize: number; force?: boolean }) =>
      apiClient.post<BRGroup[]>(`/api/stages/${stageId}/br/groups`, params),
    onSuccess: () => {
      invalidateBRGroups(queryClient, stageId);
      toast({ title: 'Groups created' });
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, 'We could not create the groups for this stage.');
      const msg = message.toLowerCase().includes('force') || message.toLowerCase().includes('existing round')
        ? 'Groups have existing rounds. Delete all rounds first, or enable "Force recreate" to override.'
        : message;
      toast({ title: 'Failed to create groups', description: msg, variant: 'destructive' });
    },
  });

  const bootstrapLobby = useMutation({
    mutationFn: () =>
      apiClient.post<{ bootstrapped: boolean }>(`/api/stages/${stageId}/br/bootstrap`, {}),
    onSuccess: () => {
      invalidateBRGroups(queryClient, stageId);
      toast({ title: 'Lobby initialized' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to initialize lobby',
        description: getApiErrorMessage(error, 'We could not initialize the lobby for this stage.'),
        variant: 'destructive',
      });
    },
  });

  const assignTeams = useMutation({
    mutationFn: (params: { method: BRDistributionMethod }) =>
      apiClient.post<{ assigned: number; groups: number }>(
        `/api/stages/${stageId}/br/groups/assign`,
        params
      ),
    onSuccess: (data) => {
      invalidateBRGroups(queryClient, stageId);
      toast({ title: `${data.assigned} teams distributed across ${data.groups} groups` });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to distribute teams',
        description: getApiErrorMessage(error, 'We could not seed participants into the current BR lobbies.'),
        variant: 'destructive',
      });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: (groupId: string) =>
      apiClient.delete(`/api/stages/${stageId}/br/groups/${groupId}`),
    onSuccess: () => {
      invalidateBRGroups(queryClient, stageId);
      toast({ title: 'Group deleted' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to delete group',
        description: getApiErrorMessage(error, 'We could not delete this group right now.'),
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
      invalidateBRGroups(queryClient, stageId);
      toast({ title: 'Group teams updated' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to update teams',
        description: getApiErrorMessage(error, 'We could not update the lobby assignments for this group.'),
        variant: 'destructive',
      });
    },
  });

  return { createGroups, bootstrapLobby, assignTeams, deleteGroup, updateGroupTeams };
};

// ── useBRGroups ──────────────────────────────────────────────────────────────
// Full hook: list query + mutations. Used by GroupManagementTab and others
// that need the groups list separately from the detail batch endpoint.
export const useBRGroups = (stageId: string | null) => {
  const { data: groups, isLoading, error, refetch } = useQuery({
    queryKey: ['br-groups', stageId],
    queryFn: () => apiClient.get<BRGroup[]>(`/api/stages/${stageId}/br/groups`),
    enabled: !!stageId,
    staleTime: 1000 * 60 * 2,
  });

  const mutations = useBRGroupsMutations(stageId);

  return {
    groups: groups ?? [],
    isLoading,
    error,
    refetch,
    ...mutations,
  };
};

// ── useBRGroupsDetail ────────────────────────────────────────────────────────
// Organizer-only stage summary. Optionally includes all group rosters when the
// caller really needs them; default is to include rosters for backwards
// compatibility.
export interface BRGroupsDetailData {
  groups: BRGroup[];
  has_rounds: boolean;
  teams_by_group: Record<string, BRGroupTeam[]>;
}

interface UseBRGroupsDetailOptions {
  includeTeams?: boolean;
}

export const useBRGroupsDetail = (
  stageId: string | null,
  options: UseBRGroupsDetailOptions = {},
) => {
  const includeTeams = options.includeTeams ?? true;

  return useQuery({
    queryKey: ['br-groups-detail', stageId, includeTeams ? 'with-teams' : 'summary'],
    queryFn: () =>
      apiClient.get<BRGroupsDetailData>(
        `/api/stages/${stageId}/br/groups/detail?includeTeams=${includeTeams ? 'true' : 'false'}`,
      ),
    enabled: !!stageId,
    staleTime: 1000 * 60 * 2,
  });
};

// ── useBRGroupTeams ──────────────────────────────────────────────────────────
// Single-group teams query. Used by BRGamesTab for the selected group.
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

// Public single-group participant list for player-facing group views.
export const useBRGroupParticipants = (stageId: string | null, groupId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['br-group-participants', stageId, groupId],
    queryFn: () =>
      apiClient.get<BRGroupTeam[]>(
        `/api/stages/${stageId}/br/groups/${groupId}/participants`
      ),
    enabled: enabled && !!stageId && !!groupId,
    staleTime: 1000 * 60 * 2,
  });
};
