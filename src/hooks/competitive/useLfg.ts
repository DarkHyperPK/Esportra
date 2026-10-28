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
 *
 * 2026-10-28: Removed useSyncValorantStats — Valorant stats now sync
 * automatically on the backend (stamped 'pending' + Hangfire job on
 * GET /game-stats/me). useMyGameStats still polls while pending/syncing.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { competitiveApiClient as apiClient } from '@/hooks/competitive/competitiveApiClient';
import { apiClient as rawApiClient } from '@/lib/apiClient';
import type { CaptainTeamRow } from '@/hooks/useEligibleCaptainTeams';
import type {
  LfgListing,
  LfgInterest,
  CreateLfgListingRequest,
  UpdateLfgListingRequest,
  ExpressInterestRequest,
  TeamDetailedMember,
  MyGameStats,
  LfgInboxEntry,
} from '@/types/competitive';

export interface AcceptInterestResponse {
  interest: LfgInterest;
  conversationId: string;
}
import { lfgKeys } from './queryKeys';

// Re-export keys so existing imports that destructure from this file still work.
export { lfgKeys };

export function useLfgCaptainTeams(userId?: string, enabled = true) {
  return useQuery({
    queryKey: ['lfg', 'captain-teams', userId],
    queryFn: () => rawApiClient.get<CaptainTeamRow[]>('/api/teams/my-captain-teams?limit=50&offset=0'),
    enabled: !!userId && enabled,
    staleTime: 60_000,
  });
}

export function useLfgInbox(direction: 'received' | 'sent', game?: string, offset = 0) {
  const params = new URLSearchParams({ direction, limit: '30', offset: String(offset) });
  if (game) params.set('game', game);
  return useQuery({
    queryKey: [...lfgKeys.inbox(direction, game), offset],
    queryFn: () => apiClient.get<LfgInboxEntry[]>(`/api/competitive/lfg/interests/mine?${params}`),
    staleTime: 15_000,
  });
}

export function useSetLfgSaved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) => saved
      ? apiClient.put(`/api/competitive/lfg/${id}/saved`, {})
      : apiClient.delete(`/api/competitive/lfg/${id}/saved`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: lfgKeys.all() }); },
  });
}

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useMyGameStats(game: string) {
  return useQuery({
    queryKey: ['my-game-stats', game],
    queryFn: () => apiClient.get<MyGameStats>(`/api/competitive/game-stats/me?game=${game}`),
    staleTime: 60_000,
    enabled: !!game,
    refetchInterval: query => ['pending', 'syncing'].includes(query.state.data?.syncStatus ?? '') ? 5000 : false,
  });
}

export function useSaveLfgDraft() {
  const qc = useQueryClient();
  const draft = useRef<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async ({ request, publish }: { request: CreateLfgListingRequest; publish: boolean }) => {
      let id = draft.current;
      if (!id) {
        const created = await apiClient.post<LfgListing>('/api/competitive/lfg', request);
        id = created.id;
        draft.current = id;
        setDraftId(id);
        void qc.invalidateQueries({ queryKey: lfgKeys.mine() });
      } else {
        const { gameSlug: _gameSlug, intent: _intent, teamId: _teamId, ...editable } = request;
        await apiClient.put<LfgListing>(`/api/competitive/lfg/${id}`, { ...editable,
          clearMode: !editable.modeKey, clearRegion: !editable.regionKey,
          clearMinRank: editable.minRankSortOrder == null, clearMaxRank: editable.maxRankSortOrder == null,
          clearDescription: !editable.description });
      }
      if (publish) await apiClient.post<LfgListing>(`/api/competitive/lfg/${id}/publish`);
      return id;
    },
    onSettled: () => { void qc.invalidateQueries({ queryKey: lfgKeys.all() }); },
  });
  return { ...mutation, draftId };
}

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

export function useTeamDetailedMembers(teamId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['team-members-detailed', teamId],
    queryFn: () => apiClient.get<TeamDetailedMember[]>(`/api/teams/${teamId}/members/detailed`),
    enabled: !!teamId && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useLfgInterests(listingId: string, enabled = true) {
  return useQuery({
    queryKey: lfgKeys.interests(listingId),
    queryFn: () => apiClient.get<LfgInterest[]>(`/api/competitive/lfg/${listingId}/interests`),
    enabled: !!listingId && enabled,
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
    onSuccess: async () => {
      // Update responses contain the listing fields but not joined identity or stats.
      await qc.invalidateQueries({ queryKey: lfgKeys.all() });
    },
  });
}

// ── Status transition hooks (POST endpoints) ───────────────────────────────────

/** POST /api/competitive/lfg/{id}/publish — allowed from draft or paused status */
export function usePublishLfgListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<LfgListing>(`/api/competitive/lfg/${id}/publish`),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: lfgKeys.all() }); },
  });
}

/** POST /api/competitive/lfg/{id}/pause */
export function usePauseLfgListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<LfgListing>(`/api/competitive/lfg/${id}/pause`),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: lfgKeys.all() }); },
  });
}

/** POST /api/competitive/lfg/{id}/close */
export function useCloseLfgListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<LfgListing>(`/api/competitive/lfg/${id}/close`),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: lfgKeys.all() }); },
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
      void qc.invalidateQueries({ queryKey: lfgKeys.all() });
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
      apiClient.post<AcceptInterestResponse>(`/api/competitive/lfg/interests/${interestId}/accept`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lfgKeys.interests(listingId) });
      void qc.invalidateQueries({ queryKey: lfgKeys.all() });
      void qc.invalidateQueries({ queryKey: ['conversations'] });
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
      void qc.invalidateQueries({ queryKey: lfgKeys.all() });
    },
  });
}

/**
 * DELETE /api/competitive/lfg/{id} — hard delete own listing
 */
export function useDeleteLfgListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete(`/api/competitive/lfg/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lfgKeys.mine() });
      void qc.invalidateQueries({ queryKey: lfgKeys.all() });
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
      void qc.invalidateQueries({ queryKey: lfgKeys.all() });
    },
  });
}
