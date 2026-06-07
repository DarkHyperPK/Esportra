import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/apiClient';
import type {
  GameCatalogApiResponse,
  GameCatalogVersionSummary,
  UpsertDraftGameRequest,
} from '@/types/gameCatalog';

const adminCatalogKeys = {
  draft: ['admin', 'game-catalog', 'draft'] as const,
  versions: ['admin', 'game-catalog', 'versions'] as const,
};

async function fetchOrCreateDraft(): Promise<GameCatalogApiResponse> {
  try {
    return await apiClient.get<GameCatalogApiResponse>('/api/admin/games/catalog/draft');
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return apiClient.post<GameCatalogApiResponse>('/api/admin/games/catalog/draft/create');
    }
    throw error;
  }
}

export function useAdminGameCatalogDraft() {
  return useQuery({
    queryKey: adminCatalogKeys.draft,
    queryFn: fetchOrCreateDraft,
    staleTime: 30_000,
  });
}

export function useAdminGameCatalogVersions() {
  return useQuery({
    queryKey: adminCatalogKeys.versions,
    queryFn: async () => {
      const response = await apiClient.get<{ versions: GameCatalogVersionSummary[] }>(
        '/api/admin/games/catalog/versions',
      );
      return response.versions;
    },
    staleTime: 60_000,
  });
}

export function useResetGameCatalogDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<GameCatalogApiResponse>('/api/admin/games/catalog/draft'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCatalogKeys.draft });
    },
  });
}

export function useUpsertDraftGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, payload }: { slug: string; payload: UpsertDraftGameRequest }) =>
      apiClient.put(`/api/admin/games/catalog/draft/games/${encodeURIComponent(slug)}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCatalogKeys.draft });
    },
  });
}

export function useDeleteDraftGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) =>
      apiClient.delete(`/api/admin/games/catalog/draft/games/${encodeURIComponent(slug)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCatalogKeys.draft });
    },
  });
}

export function useUploadDraftGameLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, file }: { slug: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return apiClient.upload<{ logoUrl: string }>(
        `/api/admin/games/catalog/draft/games/${encodeURIComponent(slug)}/logo`,
        form,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCatalogKeys.draft });
    },
  });
}

export function usePublishGameCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notes?: string) =>
      apiClient.post<GameCatalogApiResponse>('/api/admin/games/catalog/publish', { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCatalogKeys.draft });
      queryClient.invalidateQueries({ queryKey: adminCatalogKeys.versions });
      queryClient.invalidateQueries({ queryKey: ['game-catalog'] });
    },
  });
}

export function useDiscardGameCatalogDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/api/admin/games/catalog/discard'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCatalogKeys.draft });
    },
  });
}
