import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { LfgListing, LfgInterest, CreateLfgListingRequest } from '@/types/competitive';

export const lfgKeys = {
  mine: () => ['lfg', 'mine'] as const,
  listing: (id: string) => ['lfg', 'listing', id] as const,
  interests: (id: string) => ['lfg', 'interests', id] as const,
};

export function useMyLfgListings() {
  return useQuery({
    queryKey: lfgKeys.mine(),
    queryFn: () => apiClient.get<LfgListing[]>('/api/competitive/lfg/mine'),
    staleTime: 30_000,
  });
}

export function useLfgListing(id: string) {
  return useQuery({
    queryKey: lfgKeys.listing(id),
    queryFn: () => apiClient.get<LfgListing>(`/api/competitive/lfg/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useLfgInterests(listingId: string) {
  return useQuery({
    queryKey: lfgKeys.interests(listingId),
    queryFn: () => apiClient.get<LfgInterest[]>(`/api/competitive/lfg/${listingId}/interests`),
    enabled: !!listingId,
    staleTime: 30_000,
  });
}

export function useCreateLfgListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateLfgListingRequest) =>
      apiClient.post<LfgListing>('/api/competitive/lfg', req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lfgKeys.mine() });
    },
  });
}

export function useUpdateLfgStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: 'published' | 'paused' | 'closed') =>
      apiClient.patch<LfgListing>(`/api/competitive/lfg/${id}`, { status }),
    onSuccess: (updated) => {
      qc.setQueryData(lfgKeys.listing(id), updated);
      qc.invalidateQueries({ queryKey: lfgKeys.mine() });
    },
  });
}

export function useAcceptInterest(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (interestId: string) =>
      apiClient.post(`/api/competitive/lfg/${listingId}/interests/${interestId}/accept`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lfgKeys.interests(listingId) });
    },
  });
}

export function useDeclineInterest(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (interestId: string) =>
      apiClient.post(`/api/competitive/lfg/${listingId}/interests/${interestId}/decline`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lfgKeys.interests(listingId) });
    },
  });
}

export function useExpressInterest(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      apiClient.post(`/api/competitive/lfg/${listingId}/interest`, { message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lfgKeys.listing(listingId) });
    },
  });
}
