/**
 * useSeasonStandings — Season Standings Hook
 *
 * Provides React Query hooks for fetching and managing season standings.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seasonApi } from '@/services/api';
import type { SeasonStanding, PointRule, AdvancementRule, CreatePointRuleRequest, CreateAdvancementRuleRequest } from '@/types/season';
import { useToast } from './use-toast';

export function useSeasonStandings(id: string, page = 1, limit = 50) {
  return useQuery<SeasonStanding[]>({
    queryKey: ['season-standings', id, page, limit],
    queryFn: () => seasonApi.getStandings(id, page, limit),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useRecalculateStandings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => seasonApi.recalculateStandings(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['season-standings', id] });
      toast({
        title: 'Standings recalculated',
        description: 'Season standings have been recalculated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error recalculating standings',
        description: error instanceof Error ? error.message : 'Failed to recalculate standings',
        variant: 'destructive',
      });
    },
  });
}

export function useSeasonPointRules(id: string) {
  return useQuery<PointRule[]>({
    queryKey: ['season-point-rules', id],
    queryFn: () => seasonApi.getPointRules(id),
    enabled: !!id,
    staleTime: 2 * 60_000,
  });
}

export function useCreatePointRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, rule }: { id: string; rule: CreatePointRuleRequest }) => 
      seasonApi.createPointRule(id, rule),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['season-point-rules', id] });
      queryClient.invalidateQueries({ queryKey: ['season', id] });
      toast({
        title: 'Point rule created',
        description: 'Point rule has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating point rule',
        description: error instanceof Error ? error.message : 'Failed to create point rule',
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePointRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, ruleId }: { id: string; ruleId: string }) => 
      seasonApi.deletePointRule(id, ruleId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['season-point-rules', id] });
      queryClient.invalidateQueries({ queryKey: ['season', id] });
      toast({
        title: 'Point rule deleted',
        description: 'Point rule has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting point rule',
        description: error instanceof Error ? error.message : 'Failed to delete point rule',
        variant: 'destructive',
      });
    },
  });
}

export function useSeasonAdvancementRules(id: string) {
  return useQuery<AdvancementRule[]>({
    queryKey: ['season-advancement-rules', id],
    queryFn: () => seasonApi.getAdvancementRules(id),
    enabled: !!id,
    staleTime: 2 * 60_000,
  });
}

export function useCreateAdvancementRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, rule }: { id: string; rule: CreateAdvancementRuleRequest }) => 
      seasonApi.createAdvancementRule(id, rule),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['season-advancement-rules', id] });
      queryClient.invalidateQueries({ queryKey: ['season', id] });
      toast({
        title: 'Advancement rule created',
        description: 'Advancement rule has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating advancement rule',
        description: error instanceof Error ? error.message : 'Failed to create advancement rule',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAdvancementRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, ruleId }: { id: string; ruleId: string }) => 
      seasonApi.deleteAdvancementRule(id, ruleId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['season-advancement-rules', id] });
      queryClient.invalidateQueries({ queryKey: ['season', id] });
      toast({
        title: 'Advancement rule deleted',
        description: 'Advancement rule has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting advancement rule',
        description: error instanceof Error ? error.message : 'Failed to delete advancement rule',
        variant: 'destructive',
      });
    },
  });
}
