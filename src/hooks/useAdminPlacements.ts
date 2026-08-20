import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import type { PlacementZone } from '@/pages/admin/tools/SponsorAdManager/types';

export type PlacementLifecycle = 'live' | 'draft' | 'scheduled' | 'inactive' | 'expired' | 'review';

export interface Placement {
  id: string;
  sponsorId: string;
  tournamentId: string | null;
  placementZone: PlacementZone;
  slotNumber: number | null;
  bannerUrl: string | null;
  bannerAssetId: string | null;
  logoUrl: string | null;
  logoAssetId: string | null;
  headline: string | null;
  description: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  priority: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  lifecycle: PlacementLifecycle;
  reviewReason: 'overflow' | 'invalid_scope' | 'unassigned' | null;
  sponsorName: string;
  sponsorTier: string | null;
  sponsorLogoUrl: string | null;
  sponsorWebsiteUrl: string | null;
  tournamentName: string | null;
  totalImpressions: number;
  totalClicks: number;
}

export interface CreatePlacementPayload {
  sponsorId: string;
  tournamentId?: string | null;
  placementZone: PlacementZone;
  slotNumber: number;
  bannerUrl?: string | null;
  bannerAssetId?: string | null;
  logoUrl?: string | null;
  logoAssetId?: string | null;
  headline?: string | null;
  description?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  priority?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface UpdatePlacementPayload {
  bannerUrl?: string | null;
  bannerAssetId?: string | null;
  logoUrl?: string | null;
  logoAssetId?: string | null;
  headline?: string | null;
  description?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  priority?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface PlacementPage {
  items: Placement[];
  page: number;
  pageSize: number;
  total: number;
  statusCounts: Record<string, number>;
}

export interface PlacementQuery {
  sponsorId?: string;
  tournamentId?: string;
  zone?: string;
  scope?: 'all' | 'global' | 'tournament';
  status?: PlacementLifecycle;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

const keys = {
  all: ['admin', 'placements'] as const,
  list: (params?: Record<string, string | undefined>) => [...keys.all, 'list', params] as const,
  bySponsor: (sponsorId: string) => [...keys.all, 'sponsor', sponsorId] as const,
  byTournament: (tournamentId: string) => [...keys.all, 'tournament', tournamentId] as const,
  global: () => [...keys.all, 'global'] as const,
};

export const useAdminPlacements = (params?: PlacementQuery) =>
  useQuery({
    queryKey: keys.list(params as Record<string, string | undefined>),
    queryFn: () => {
      const search = new URLSearchParams();
      if (params?.sponsorId) search.set('sponsorId', params.sponsorId);
      if (params?.tournamentId) search.set('tournamentId', params.tournamentId);
      if (params?.zone) search.set('zone', params.zone);
      if (params?.scope && params.scope !== 'all') search.set('scope', params.scope);
      if (params?.status) search.set('status', params.status);
      if (params?.search) search.set('search', params.search);
      if (params?.sortBy) search.set('sortBy', params.sortBy);
      if (params?.sortDirection) search.set('sortDirection', params.sortDirection);
      if (params?.page) search.set('page', String(params.page));
      if (params?.pageSize) search.set('pageSize', String(params.pageSize));
      const qs = search.toString();
      return apiClient.get<PlacementPage>(`/api/admin/placements${qs ? `?${qs}` : ''}`);
    },
  });

export const useSponsorPlacements = (sponsorId: string) =>
  useQuery({
    queryKey: keys.bySponsor(sponsorId),
    queryFn: () => apiClient.get<Placement[]>(`/api/admin/sponsors/${sponsorId}/placements`),
    enabled: !!sponsorId,
  });

export const useTournamentPlacements = (tournamentId: string) =>
  useQuery({
    queryKey: keys.byTournament(tournamentId),
    queryFn: () => apiClient.get<Placement[]>(`/api/admin/tournaments/${tournamentId}/placements`),
    enabled: !!tournamentId,
  });

export const useCreatePlacement = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreatePlacementPayload) =>
      apiClient.post<{ id: string }>('/api/admin/placements', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      toast({ title: 'Placement created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create placement', description: error.message || 'Unknown error', variant: 'destructive' });
    },
  });
};

export const useResolvePlacementReview = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; tournamentId: string | null; placementZone: PlacementZone; slotNumber: number }) =>
      apiClient.put(`/api/admin/placements/${id}/resolve`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      toast({ title: 'Placement review resolved' });
    },
    onError: (error: Error) => toast({ title: 'Failed to resolve placement', description: error.message, variant: 'destructive' }),
  });
};

export const useUpdatePlacement = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdatePlacementPayload & { id: string }) =>
      apiClient.put(`/api/admin/placements/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      toast({ title: 'Placement updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeletePlacement = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/admin/placements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      toast({ title: 'Placement removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUploadPlacementAsset = () => {
  return useMutation({
    mutationFn: async ({ file, zone, assetRole }: { file: File; zone: PlacementZone; assetRole: 'banner' | 'logo' }): Promise<{ assetId: string; url: string }> => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('zone', zone);
      fd.append('assetRole', assetRole);
      return apiClient.upload<{ assetId: string; url: string }>('/api/admin/placement-assets', fd);
    },
  });
};

export const useReplaceCreative = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, assetId }: { id: string; assetId: string }) =>
      apiClient.put(`/api/admin/placements/${id}/replace-creative`, { assetId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      toast({ title: 'Creative replaced' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to replace creative', description: error.message, variant: 'destructive' });
    },
  });
};

export const useRemoveCreative = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/admin/placements/${id}/remove-creative`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      toast({ title: 'Creative removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove creative', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUnassignPlacement = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/admin/placements/${id}/unassign`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      toast({ title: 'Placement unassigned' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to unassign', description: error.message, variant: 'destructive' });
    },
  });
};
