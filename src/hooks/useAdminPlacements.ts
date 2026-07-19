import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

export interface Placement {
  id: string;
  sponsorId: string;
  tournamentId: string | null;
  placementZone: string;
  bannerUrl: string | null;
  logoUrl: string | null;
  headline: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  priority: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  sponsorName: string;
  sponsorTier: string | null;
  sponsorLogoUrl: string | null;
  sponsorWebsiteUrl: string | null;
  tournamentName: string | null;
}

export interface CreatePlacementPayload {
  sponsorId: string;
  tournamentId?: string | null;
  placementZone: string;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  headline?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  priority?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface UpdatePlacementPayload {
  bannerUrl?: string | null;
  logoUrl?: string | null;
  headline?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  priority?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

const keys = {
  all: ['admin', 'placements'] as const,
  list: (params?: Record<string, string | undefined>) => [...keys.all, 'list', params] as const,
  bySponsor: (sponsorId: string) => [...keys.all, 'sponsor', sponsorId] as const,
  byTournament: (tournamentId: string) => [...keys.all, 'tournament', tournamentId] as const,
  global: () => [...keys.all, 'global'] as const,
};

export const useAdminPlacements = (params?: { sponsorId?: string; tournamentId?: string; zone?: string }) =>
  useQuery({
    queryKey: keys.list(params as Record<string, string | undefined>),
    queryFn: () => {
      const search = new URLSearchParams();
      if (params?.sponsorId) search.set('sponsorId', params.sponsorId);
      if (params?.tournamentId) search.set('tournamentId', params.tournamentId);
      if (params?.zone) search.set('zone', params.zone);
      const qs = search.toString();
      return apiClient.get<Placement[]>(`/api/admin/placements${qs ? `?${qs}` : ''}`);
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
    onError: (err: any) => {
      toast({ title: 'Failed to create placement', description: err?.message || 'Unknown error', variant: 'destructive' });
    },
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
    onError: (err: any) => {
      toast({ title: 'Failed to update', description: err?.message, variant: 'destructive' });
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
    onError: (err: any) => {
      toast({ title: 'Failed to remove', description: err?.message, variant: 'destructive' });
    },
  });
};

export const useUploadPlacementAsset = () => {
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'system.assets.partners');
      fd.append('folder', 'placements');
      const { url } = await apiClient.upload<{ url: string; path: string }>('/api/storage/upload', fd);
      return url;
    },
  });
};
