import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import type { BRLobbyFormationConfig } from '@/types/battleRoyale';
import type { BrScheduleManifest } from '@/utils/brScheduleGenerator';

export function useBRStageSchedule(stageId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const scheduleQuery = useQuery({
    queryKey: ['br-stage-schedule', stageId],
    enabled: Boolean(stageId),
    queryFn: () => apiClient.get<BRLobbyFormationConfig>(`/api/stages/${stageId}/br/schedule`),
  });

  const generatePreview = useMutation({
    mutationFn: (params: { seedGroupCount: number; groupsPerLobby?: number; matchesPerWave?: number }) =>
      apiClient.post<BrScheduleManifest>(`/api/stages/${stageId}/br/schedule/generate`, params),
    onError: (error: unknown) => {
      toast({
        title: 'Could not generate schedule',
        description: getApiErrorMessage(error, {
          context: 'brStageSchedule',
          fallback: 'Check that seed group count is even and at least 2.',
        }),
        variant: 'destructive',
      });
    },
  });

  const commitSchedule = useMutation({
    mutationFn: (formation: BRLobbyFormationConfig & { waves?: BrScheduleManifest['waves'] }) =>
      apiClient.post<{ committed: boolean }>(`/api/stages/${stageId}/br/schedule`, formation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['br-stage-schedule', stageId] });
      queryClient.invalidateQueries({ queryKey: ['br-groups-detail', stageId] });
      queryClient.invalidateQueries({ queryKey: ['br-lobbies', stageId] });
      queryClient.invalidateQueries({ queryKey: ['br-games'] });
      toast({ title: 'Matches created', description: 'Round schedule is ready — set start times below.' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Could not create matches',
        description: getApiErrorMessage(error, { context: 'brStageSchedule' }),
        variant: 'destructive',
      });
    },
  });

  return {
    schedule: scheduleQuery.data,
    isLoadingSchedule: scheduleQuery.isLoading,
    generatePreview,
    commitSchedule,
  };
}
