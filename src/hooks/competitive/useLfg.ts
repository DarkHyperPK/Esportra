/**
 * useLfg.ts
 *
 * PROJ-075 overhaul (2026-10-25):
 * - Removed useUpdateLfgStatus (PATCH → 405). Replaced with three POST hooks.
 *   A deprecated wrapper is retained for backward compat with LfgManagePage
 *   until it is rewritten in T11-T13.
 * - Fixed useAcceptInterest / useDeclineInterest URL paths (BREAK-9).
 *   listingId param is kept for cache invalidation; it is no longer in the URL.
 * - Added usePublishLfgListing, usePauseLfgListing, useCloseLfgListing.
 * - useLfgListing and useLfgInterests now use canonical query keys.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type {
  LfgListing,
  LfgInterest,
  CreateLfgListingRequest,
  UpdateLfgListingRequest,
  ExpressInterestRequest,
} from '@/types/competitive';
import { lfgKeys } from './queryKeys';

// Re-export keys so existing imports that destructure from this file still work.
export { lfgKeys };

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useMyLfgListings() {
  return useQuery({
    queryKey: lfgKeys.mine(),
    queryFn: () => apiClient.get<LfgListing[]>('/api/competitive/lfg/mine'),
    staleTime: 30_000,
  });
}

export function useLfgListing(id: string) {
  return useQuery({
    queryKey: lfgKeys.detail(id),
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

// ── Create / edit mutation hooks ───────────────────────────────────────────────

export function useCreateLfgListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateLfgListingRequest) =>
      apiClient.post<LfgListing>('/api/competitive/lfg', req),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lfgKeys.mine() });
    },
  });
}

export function useUpdateLfgListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: UpdateLfgListingRequest) =>
      apiClient.put<LfgListing>(`/api/competitive/lfg/${id}`, req),
    onSuccess: (updated) => {
      qc.setQueryData(lfgKeys.detail(id), updated);
      void qc.invalidateQueries({ queryKey: lfgKeys.mine() });
    },
  });
}

// ── Status transition hooks (POST endpoints) ───────────────────────────────────

/** POST /api/competitive/lfg/{id}/publish — allowed from draft or paused status */
export function usePublishLfgListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<LfgListing>(`/api/competitive/lfg/${id}/publish`),
    onSuccess: (updated) => {
      qc.setQueryData(lfgKeys.detail(id), updated);
      void qc.invalidateQueries({ queryKey: lfgKeys.mine() });
      // Broad invalidation: new listing now visible in discovery feeds
      void qc.invalidateQueries({ queryKey: lfgKeys.all() });
    },
  });
}

/** POST /api/competitive/lfg/{id}/pause */
export function usePauseLfgListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<LfgListing>(`/api/competitive/lfg/${id}/pause`),
    onSuccess: (updated) => {
      qc.setQueryData(lfgKeys.detail(id), updated);
      void qc.invalidateQueries({ queryKey: lfgKeys.mine() });
      void qc.invalidateQueries({ queryKey: lfgKeys.all() });
    },
  });
}

/** POST /api/competitive/lfg/{id}/close */
export function useCloseLfgListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<LfgListing>(`/api/competitive/lfg/${id}/close`),
    onSuccess: (updated) => {
      qc.setQueryData(lfgKeys.detail(id), updated);
      void qc.invalidateQueries({ queryKey: lfgKeys.mine() });
      void qc.invalidateQueries({ queryKey: lfgKeys.all() });
    },
  });
}

/**
 * @deprecated Use usePublishLfgListing, usePauseLfgListing, or useCloseLfgListing.
 * Kept for backward compat with LfgManagePage until it is rewritten in T11-T13.
 * Internally routes to the correct POST endpoint.
 */
export function useUpdateLfgStatus(id: string) {
  const publish = usePublishLfgListing(id);
  const pause = usePauseLfgListing(id);
  const close = useCloseLfgListing(id);

  return {
    mutate: (status: 'published' | 'paused' | 'closed') => {
      if (status === 'published') publish.mutate();
      else if (status === 'paused') pause.mutate();
      else close.mutate();
    },
    mutateAsync: (status: 'published' | 'paused' | 'closed') => {
      if (status === 'published') return publish.mutateAsync();
      if (status === 'paused') return pause.mutateAsync();
      return close.mutateAsync();
    },
    isPending: publish.isPending || pause.isPending || close.isPending,
    isError: publish.isError || pause.isError || close.isError,
    error: publish.error ?? pause.error ?? close.error,
  };
}

// ── Interest hooks ─────────────────────────────────────────────────────────────

/**
 * POST /api/competitive/lfg/{listingId}/interest
 */
export function useExpressInterest(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: ExpressInterestRequest) =>
      apiClient.post<LfgInterest>(`/api/competitive/lfg/${listingId}/interest`, req),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lfgKeys.detail(listingId) });
    },
  });
}

/**
 * POST /api/competitive/lfg/interests/{interestId}/accept
 * BREAK-9 fix: listingId is NOT in the URL path. It is used only for cache invalidation.
 */
export function useAcceptInterest(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (interestId: string) =>
      apiClient.post(`/api/competitive/lfg/interests/${interestId}/accept`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lfgKeys.interests(listingId) });
    },
  });
}

/**
 * POST /api/competitive/lfg/interests/{interestId}/decline
 * BREAK-9 fix: listingId is NOT in the URL path. It is used only for cache invalidation.
 */
export function useDeclineInterest(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (interestId: string) =>
      apiClient.post(`/api/competitive/lfg/interests/${interestId}/decline`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lfgKeys.interests(listingId) });
    },
  });
}

/**
 * DELETE /api/competitive/lfg/{listingId}/interest — withdraw own interest
 */
export function useWithdrawInterest(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete(`/api/competitive/lfg/${listingId}/interest`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lfgKeys.detail(listingId) });
    },
  });
}
