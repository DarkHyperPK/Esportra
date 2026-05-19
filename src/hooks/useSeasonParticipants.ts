import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seasonApi } from '@/services/api';
import type { SeasonParticipant } from '@/types/season';
import { useToast } from './use-toast';

export function useRegisterForSeason() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ seasonId, payload }: { seasonId: string; payload?: { nodeId?: string; teamId?: string; rosterId?: string; notes?: string } }) =>
      seasonApi.registerForSeason(seasonId, payload),
    onSuccess: (_, { seasonId }) => {
      queryClient.invalidateQueries({ queryKey: ['season-participants', seasonId] });
      toast({
        title: 'Registration submitted',
        description: 'Your season registration has been submitted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'Could not submit registration.',
        variant: 'destructive',
      });
    },
  });
}

export function useSeasonParticipants(id: string) {
  return useQuery<SeasonParticipant[]>({
    queryKey: ['season-participants', id],
    queryFn: async () => {
      const response = await seasonApi.getSeasonParticipants(id);
      return response;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useUpdateParticipantStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ seasonId, participantId, status, notes }: { seasonId: string; participantId: string; status: string; notes?: string }) =>
      seasonApi.updateParticipantStatus(seasonId, participantId, { status, notes }),
    onSuccess: (_, { seasonId }) => {
      queryClient.invalidateQueries({ queryKey: ['season-participants', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
      toast({
        title: 'Status updated',
        description: 'Participant status has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating status',
        description: error instanceof Error ? error.message : 'Failed to update status.',
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveParticipant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ seasonId, participantId }: { seasonId: string; participantId: string }) =>
      seasonApi.removeParticipant(seasonId, participantId),
    onSuccess: (_, { seasonId }) => {
      queryClient.invalidateQueries({ queryKey: ['season-participants', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
      toast({
        title: 'Participant removed',
        description: 'Team has been removed from the season.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error removing participant',
        description: error instanceof Error ? error.message : 'Failed to remove participant.',
        variant: 'destructive',
      });
    },
  });
}
