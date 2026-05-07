/**
 * useSeasons — Season List Hook
 *
 * Provides React Query hooks for fetching and managing seasons.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seasonApi } from '@/services/api';
import type { Season, SeasonList, CreateSeasonRequest, UpdateSeasonRequest } from '@/types/season';
import { useToast } from './use-toast';

export function useSeasons(page = 1, limit = 50, status?: string, game?: string) {
  return useQuery<SeasonList[]>({
    queryKey: ['seasons', page, limit, status, game],
    queryFn: () => seasonApi.getSeasons(page, limit, status, game),
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
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateSeasonRequest) => seasonApi.createSeason(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast({
        title: 'Season created',
        description: 'Your season has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating season',
        description: error instanceof Error ? error.message : 'Failed to create season',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSeason() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSeasonRequest }) => 
      seasonApi.updateSeason(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['season', data.id] });
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
    mutationFn: (id: string) => seasonApi.publishSeason(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['season', data.id] });
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

export function useCancelSeason() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => seasonApi.cancelSeason(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['season', data.id] });
      toast({
        title: 'Season cancelled',
        description: 'Your season has been cancelled successfully.',
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
