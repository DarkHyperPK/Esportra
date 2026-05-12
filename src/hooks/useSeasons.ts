/**
 * useSeasons — Season List Hook
 *
 * Provides React Query hooks for fetching and managing seasons.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seasonApi } from '@/services/api';
import type {
  Season,
  SeasonList,
  CreateSeasonRequest,
  CreateSeasonResponse,
  UpdateSeasonPayload,
  SeasonAdvancementConnection,
  SeasonAuditLogEntry,
  AddSeasonTournamentRequest,
} from '@/types/season';
import { useToast } from './use-toast';
import { ApiError } from '@/lib/apiClient';
export { useSeasonTournaments } from './useSeasonStandings';

export function useSeasons(page = 1, limit = 50, status?: string, game?: string, mine?: boolean) {
  return useQuery<SeasonList[]>({
    queryKey: ['seasons', page, limit, status, game, mine],
    queryFn: () => seasonApi.getSeasons(page, limit, status, game, mine),
    staleTime: 2 * 60_000,
  });
}

export function useSeason(id: string) {
  return useQuery<Season>({
    queryKey: ['season', id],
    queryFn: () => seasonApi.getSeason(id),
    enabled: !!id,
    staleTime: 2 * 60_000,
  });
}

export function useCreateSeason() {
  const queryClient = useQueryClient();

  return useMutation<CreateSeasonResponse, Error, CreateSeasonRequest>({
    mutationFn: async (data: CreateSeasonRequest) => {
      try {
        return await seasonApi.createSeason(data);
      } catch (error) {
        if (error instanceof ApiError) {
          console.error('[SeasonCreate] API error', {
            status: error.status,
            body: error.body,
            request: data,
          });
        } else {
          console.error('[SeasonCreate] Unexpected error', {
            error,
            request: data,
          });
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
  });
}

export function useUpdateSeason(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateSeasonPayload) => seasonApi.updateSeasonDetail(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['season-detail', id] });
      toast({
        title: 'Season updated',
        description: 'Your season has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating season',
        description: error instanceof Error ? error.message : 'Failed to update season',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSeason() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => seasonApi.deleteSeason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast({
        title: 'Season deleted',
        description: 'Your season has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting season',
        description: error instanceof Error ? error.message : 'Failed to delete season',
        variant: 'destructive',
      });
    },
  });
}

export function usePublishSeason() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ seasonId, req }: { seasonId: string; req?: { allowIncomplete?: boolean; activate?: boolean } }) =>
      seasonApi.publishSeason(seasonId, req),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['season-detail', data.id] });
      toast({
        title: 'Season published',
        description: 'Your season has been published successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error publishing season',
        description: error instanceof Error ? error.message : 'Failed to publish season',
        variant: 'destructive',
      });
    },
  });
}

function useSeasonLifecycleMutation(
  mutationFn: (id: string) => Promise<Season>,
  successTitle: string,
  successDescription: string,
  errorTitle: string
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['season', data.id] });
      toast({
        title: successTitle,
        description: successDescription,
      });
    },
    onError: (error) => {
      toast({
        title: errorTitle,
        description: error instanceof Error ? error.message : 'The season status could not be updated.',
        variant: 'destructive',
      });
    },
  });
}

export function useStartSeason() {
  return useSeasonLifecycleMutation(
    seasonApi.startSeason,
    'Season started',
    'Your season is now live.',
    'Error starting season'
  );
}

export function useCompleteSeason() {
  return useSeasonLifecycleMutation(
    seasonApi.completeSeason,
    'Season completed',
    'Your season has been completed.',
    'Error completing season'
  );
}

export function useArchiveSeason() {
  return useSeasonLifecycleMutation(
    seasonApi.archiveSeason,
    'Season archived',
    'Your season has been archived.',
    'Error archiving season'
  );
}

export function useSyncSeasonStatus() {
  return useSeasonLifecycleMutation(
    seasonApi.syncSeasonStatus,
    'Season status synced',
    'Season status has been synced from schedule rules.',
    'Error syncing season status'
  );
}

export function useCancelSeason() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ seasonId, reason }: { seasonId: string; reason: string }) =>
      seasonApi.cancelSeason(seasonId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast({
        title: 'Season cancelled',
        description: 'The season has been cancelled.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error cancelling season',
        description: error instanceof Error ? error.message : 'Failed to cancel season',
        variant: 'destructive',
      });
    },
  });
}

export function useDuplicateSeason() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ seasonId, newName, newSlug }: { seasonId: string; newName: string; newSlug: string }) =>
      seasonApi.duplicateSeason(seasonId, newName, newSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast({
        title: 'Season duplicated',
        description: 'A copy of the season has been created.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error duplicating season',
        description: error instanceof Error ? error.message : 'Failed to duplicate season',
        variant: 'destructive',
      });
    },
  });
}

export function useSeasonAdvancement(id: string) {
  return useQuery<SeasonAdvancementConnection[]>({
    queryKey: ['season-advancement', id],
    queryFn: () => seasonApi.getSeasonAdvancement(id),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}

export function useSeasonAuditLog(id: string) {
  return useQuery<SeasonAuditLogEntry[]>({
    queryKey: ['season-audit-log', id],
    queryFn: () => seasonApi.getSeasonAuditLog(id),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}

export function useAddSeasonTournament() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ seasonId, tournament }: { seasonId: string; tournament: AddSeasonTournamentRequest }) =>
      seasonApi.addSeasonTournament(seasonId, tournament),
    onSuccess: (_, { seasonId }) => {
      queryClient.invalidateQueries({ queryKey: ['season-tournaments', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season-detail', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
      toast({
        title: 'Tournament created',
        description: 'The tournament has been added to this season.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating tournament',
        description: error instanceof Error ? error.message : 'Failed to create tournament',
        variant: 'destructive',
      });
    },
  });
}