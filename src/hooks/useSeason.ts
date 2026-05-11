/**
 * useSeason — Season Detail Hooks
 *
 * Query and mutation hooks for managing a single season's full detail view.
 * All hooks accept a season ID baked into the closure; GET queries require a
 * non-empty ID (`enabled: !!id`).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/apiClient';
import { seasonApi } from '@/services/api';
import type {
  SeasonDetailResponse,
  SeasonQualificationRecord,
  SeasonStanding,
} from '@/types/season';
import { useToast } from './use-toast';

// ── Queries ────────────────────────────────────────────────────────────────

export function useSeason(id: string | undefined) {
  return useQuery<SeasonDetailResponse>({
    queryKey: ['season-detail', id],
    queryFn: () => seasonApi.getSeasonDetail(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}

export function useSeasonQualifications(id: string | undefined) {
  return useQuery<SeasonQualificationRecord[]>({
    queryKey: ['season-qualifications', id],
    queryFn: () => seasonApi.getSeasonQualifications(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}

export function useSeasonStandings(id: string | undefined) {
  return useQuery<SeasonStanding[]>({
    queryKey: ['season-standings', id],
    queryFn: () => seasonApi.getStandings(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

export function useSyncSeasonNodes(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (nodes: unknown[]) => seasonApi.syncSeasonNodes(id, nodes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
    onError: (error) => {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Could not sync season nodes.',
        variant: 'destructive',
      });
    },
  });
}

export function useSyncSeasonRules(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (rules: unknown[]) => seasonApi.syncSeasonRules(id, rules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-detail', id] });
    },
    onError: (error) => {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Could not sync season rules.',
        variant: 'destructive',
      });
    },
  });
}

export function useSyncSeasonStaff(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (staff: unknown[]) => seasonApi.syncSeasonStaff(id, staff),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-detail', id] });
    },
    onError: (error) => {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Could not sync season staff.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSeasonQualification(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: {
      recordId: string;
      status?: string;
      qualificationType?: string;
      destinationNodeId?: string;
      notes?: string;
    }) => {
      const { recordId, ...rest } = payload;
      return seasonApi.updateQualification(id, recordId, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-qualifications', id] });
      queryClient.invalidateQueries({ queryKey: ['season-detail', id] });
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Could not update qualification.',
        variant: 'destructive',
      });
    },
  });
}

export function useRecalculateSeason(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => seasonApi.recalculateSeason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-standings', id] });
      queryClient.invalidateQueries({ queryKey: ['season-qualifications', id] });
      queryClient.invalidateQueries({ queryKey: ['season-detail', id] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        console.error('[RecalculateSeason] API error', { status: error.status, body: error.body });
      }
      toast({
        title: 'Recalculation failed',
        description: error instanceof Error ? error.message : 'Could not recalculate this season.',
        variant: 'destructive',
      });
    },
  });
}
