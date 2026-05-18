/**
 * useSeasonStandings — Season Standings Hook
 *
 * Provides React Query hooks for fetching and managing season standings.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seasonApi } from '@/services/api';
import type { SeasonStanding, PointRule, AdvancementRule, CreatePointRuleRequest, CreateAdvancementRuleRequest, SeasonTournamentDetails } from '@/types/season';
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

export function usePreviewSeasonAdvancement() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, tournamentId }: { id: string; tournamentId?: string }) =>
      seasonApi.previewAdvancement(id, tournamentId),
    onError: (error) => {
      toast({
        title: 'Error previewing advancement',
        description: error instanceof Error ? error.message : 'Failed to preview advancement',
        variant: 'destructive',
      });
    },
  });
}

export function useProcessSeasonAdvancement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, tournamentId }: { id: string; tournamentId?: string }) =>
      seasonApi.processAdvancement(id, tournamentId),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['season-standings', id] });
      queryClient.invalidateQueries({ queryKey: ['season-tournaments', id] });
      toast({
        title: 'Advancement processed',
        description: `${data.advanced_count} team${data.advanced_count === 1 ? '' : 's'} advanced.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error processing advancement',
        description: error instanceof Error ? error.message : 'Failed to process advancement',
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

export function useSeasonTournaments(id: string) {
  return useQuery<SeasonTournamentDetails[]>({
    queryKey: ['season-tournaments', id],
    queryFn: () => seasonApi.getSeasonTournaments(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useLinkTournamentToSeason() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ tournamentId, seasonId, seasonRole, seasonStageOrder }: { tournamentId: string; seasonId: string; seasonRole: string; seasonStageOrder: number }) =>
      seasonApi.linkTournament(tournamentId, {
        season_id: seasonId,
        season_role: seasonRole,
        season_stage_order: seasonStageOrder,
      }),
    onSuccess: (_, { seasonId }) => {
      queryClient.invalidateQueries({ queryKey: ['season-tournaments', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
      toast({
        title: 'Tournament linked',
        description: 'Tournament has been linked to this season.',
      });
    },
    onError: () => {
      toast({
        title: 'Error linking tournament',
        description: 'We could not link the tournament right now.',
        variant: 'destructive',
      });
    },
  });
}

export function useUnlinkTournamentFromSeason() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ tournamentId }: { tournamentId: string; seasonId: string }) =>
      seasonApi.unlinkTournament(tournamentId),
    onSuccess: (_, { seasonId }) => {
      queryClient.invalidateQueries({ queryKey: ['season-tournaments', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
      toast({
        title: 'Tournament unlinked',
        description: 'Tournament has been removed from this season.',
      });
    },
    onError: () => {
      toast({
        title: 'Error unlinking tournament',
        description: 'We could not unlink the tournament right now.',
        variant: 'destructive',
      });
    },
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
