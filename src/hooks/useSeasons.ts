import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type {
  CreateSeasonPayload,
  CreateSeasonResponse,
  CreateSeasonWorkspacePayload,
  SeasonListItem,
  UpdateSeasonPayload,
  PublishSeasonRequest,
  PublishSeasonResponse,
  SeasonTournament,
  SeasonStanding,
  SeasonAuditLog,
  AddSeasonTournamentRequest,
  ReorderSeasonTournamentsRequest,
} from '@/types/season';
import { toSeasonNodeDraftPayload } from '@/components/season/builder/seasonBuilderUtils';

type SeasonListApiRow = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  game: string;
  participant_mode: 'team' | 'solo';
  status: 'draft' | 'published' | 'active' | 'completed' | 'archived';
  is_public?: boolean;
  owner_user_id?: string;
  organization_id?: string | null;
  owner_username?: string | null;
  owner_full_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
  node_count?: number;
  is_season_staff?: boolean;
};

type CreateSeasonApiResponse = {
  id: string;
  slug: string;
  root_node_id: string;
};

const mapCreateSeasonResponse = (row: CreateSeasonApiResponse): CreateSeasonResponse => ({
  id: row.id,
  slug: row.slug,
  rootNodeId: row.root_node_id,
});

const mapSeasonListItem = (row: SeasonListApiRow): SeasonListItem => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description ?? null,
  game: row.game,
  participantMode: row.participant_mode,
  status: row.status,
  isPublic: row.is_public,
  ownerUserId: row.owner_user_id,
  organizationId: row.organization_id ?? null,
  ownerUsername: row.owner_username ?? null,
  ownerFullName: row.owner_full_name ?? null,
  startDate: row.start_date ?? null,
  endDate: row.end_date ?? null,
  bannerUrl: row.banner_url ?? null,
  logoUrl: row.logo_url ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  nodeCount: row.node_count,
  isSeasonStaff: row.is_season_staff,
});

export const useSeasons = (options?: { mine?: boolean }) => {
  const mine = options?.mine ?? false;

  return useQuery<SeasonListItem[]>({
    queryKey: ['seasons', { mine }],
    queryFn: async () => {
      const path = mine ? '/api/seasons?mine=true' : '/api/seasons';
      const rows = await apiClient.get<SeasonListApiRow[]>(path);
      return rows.map(mapSeasonListItem);
    },
    staleTime: 60_000,
  });
};

export const useCreateSeason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSeasonPayload) =>
      apiClient
        .post<CreateSeasonApiResponse>('/api/seasons', payload)
        .then(mapCreateSeasonResponse),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
  });
};

export const useCreateSeasonWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ season, nodes }: CreateSeasonWorkspacePayload) => {
      const createdSeason = await apiClient
        .post<CreateSeasonApiResponse>('/api/seasons', season)
        .then(mapCreateSeasonResponse);

      const rootNodeId = createdSeason.rootNodeId;
      const currentRootId = nodes.find((node) => node.nodeType === 'root')?.id ?? nodes[0]?.id;

      // Clean node data (convert empty strings to null) then swap root IDs
      const cleanedNodes = toSeasonNodeDraftPayload(nodes).map((node) => ({
        ...node,
        id: node.id === currentRootId ? rootNodeId : node.id,
        parentNodeId: node.parentNodeId === currentRootId ? rootNodeId : node.parentNodeId,
        slug: node.slug?.trim() || null,
        region: node.region?.trim() || null,
        city: node.city?.trim() || null,
        country: node.country?.trim() || null,
        linkedStageId: node.linkedStageId?.trim() || null,
        registrationDeadline: node.registrationDeadline || null,
        startsAt: node.startsAt || null,
        endsAt: node.endsAt || null,
      }));

      await apiClient.put<{ success: boolean; count: number }>(`/api/seasons/${createdSeason.id}/nodes`, {
        nodes: cleanedNodes,
      });

      return createdSeason;
    },
    onSuccess: (season) => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['season', season.id] });
    },
  });
};

export const useUpdateSeason = (seasonId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSeasonPayload) =>
      apiClient.put<{ id: string; slug: string; updated_at: string }>(`/api/seasons/${seasonId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
    },
  });
};

export const usePublishSeason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seasonId, req }: { seasonId: string; req: PublishSeasonRequest }) =>
      apiClient.post<PublishSeasonResponse>(`/api/seasons/${seasonId}/publish`, req),
    // onSuccess(data, variables): first arg is the API response, second is the mutation input
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['season', variables.seasonId] });
    },
  });
};

export const useArchiveSeason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seasonId: string) =>
      apiClient.post<{ success: boolean; status: string }>(`/api/seasons/${seasonId}/archive`, {}),
    onSuccess: (_, seasonId) => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
    },
  });
};

export const useCancelSeason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seasonId, reason }: { seasonId: string; reason: string }) =>
      apiClient.post<{ success: boolean; status: string }>(`/api/seasons/${seasonId}/cancel`, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['season', variables.seasonId] });
    },
  });
};

export const useDuplicateSeason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seasonId, newName, newSlug }: { seasonId: string; newName: string; newSlug: string }) =>
      apiClient.post<{ success: boolean; seasonId: string }>(`/api/seasons/${seasonId}/duplicate`, { newName, newSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
  });
};

export const useSeasonTournaments = (seasonId: string) => {
  return useQuery<SeasonTournament[]>({
    queryKey: ['seasonTournaments', seasonId],
    queryFn: () => apiClient.get<SeasonTournament[]>(`/api/seasons/${seasonId}/tournaments`),
    enabled: !!seasonId,
  });
};

export const useSeasonAdvancement = (seasonId: string) => {
  return useQuery({
    queryKey: ['seasonAdvancement', seasonId],
    queryFn: () => apiClient.get(`/api/seasons/${seasonId}/advancement`),
    enabled: !!seasonId,
  });
};

export const useSeasonStandings = (seasonId: string) => {
  return useQuery<SeasonStanding[]>({
    queryKey: ['seasonStandings', seasonId],
    queryFn: () => apiClient.get<SeasonStanding[]>(`/api/seasons/${seasonId}/standings`),
    enabled: !!seasonId,
  });
};

export const useSeasonAuditLog = (seasonId: string) => {
  return useQuery<SeasonAuditLog[]>({
    queryKey: ['seasonAuditLog', seasonId],
    queryFn: () => apiClient.get<SeasonAuditLog[]>(`/api/admin/seasons/${seasonId}/audit`),
    enabled: !!seasonId,
  });
};

export const useAddSeasonTournament = (seasonId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: AddSeasonTournamentRequest) =>
      apiClient.post<{ seasonTournamentId: string; tournamentId: string; slug: string }>(
        `/api/seasons/${seasonId}/tournaments`,
        req,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonTournaments', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
    },
  });
};

export const useRemoveSeasonTournament = (seasonId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (seasonTournamentId: string) =>
      apiClient.delete(`/api/seasons/${seasonId}/tournaments/${seasonTournamentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonTournaments', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
    },
  });
};

export const useReorderSeasonTournaments = (seasonId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: ReorderSeasonTournamentsRequest) =>
      apiClient.patch<{ success: boolean }>(`/api/seasons/${seasonId}/tournaments/reorder`, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonTournaments', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
    },
  });
};

type SeasonAnnouncement = {
  id: string;
  season_id: string;
  title: string;
  body: string;
  target_audience: 'all' | 'qualified' | 'eliminated' | 'specific_tournament';
  target_tournament_id?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type CreateAnnouncementRequest = {
  title: string;
  body: string;
  target_audience: 'all' | 'qualified' | 'eliminated' | 'specific_tournament';
  target_tournament_id?: string;
};

type UpdateAnnouncementRequest = {
  title?: string;
  body?: string;
  target_audience?: 'all' | 'qualified' | 'eliminated' | 'specific_tournament';
  target_tournament_id?: string;
};

export const useSeasonAnnouncements = (seasonId: string) => {
  return useQuery<SeasonAnnouncement[]>({
    queryKey: ['seasonAnnouncements', seasonId],
    queryFn: () => apiClient.get<SeasonAnnouncement[]>(`/api/seasons/${seasonId}/announcements`),
    enabled: !!seasonId,
  });
};

export const useCreateAnnouncement = (seasonId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateAnnouncementRequest) =>
      apiClient.post<SeasonAnnouncement>(`/api/seasons/${seasonId}/announcements`, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonAnnouncements', seasonId] });
    },
  });
};

export const useUpdateAnnouncement = (seasonId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ announcementId, req }: { announcementId: string; req: UpdateAnnouncementRequest }) =>
      apiClient.patch<SeasonAnnouncement>(
        `/api/seasons/${seasonId}/announcements/${announcementId}`,
        req,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonAnnouncements', seasonId] });
    },
  });
};

export const useDeleteAnnouncement = (seasonId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) =>
      apiClient.delete(`/api/seasons/${seasonId}/announcements/${announcementId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonAnnouncements', seasonId] });
    },
  });
};
