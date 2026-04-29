import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type {
  CreateSeasonPayload,
  CreateSeasonResponse,
  SeasonListItem,
  UpdateSeasonPayload,
} from '@/types/season';

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
  created_at?: string;
  updated_at?: string;
  node_count?: number;
  is_season_staff?: boolean;
};

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
      apiClient.post<CreateSeasonResponse>('/api/seasons', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
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

