import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface QualifiedTeam {
  team_id: string;
  team_name: string;
  logo_url: string | null;
  from_group: string;
  total_points: number;
  total_kills: number;
  wins: number;
}

interface AdvancePreviewResponse {
  stage_name: string;
  groups_count: number;
  teams_per_group: number;
  total_qualified: number;
  qualified_teams: QualifiedTeam[];
}

interface AdvanceExecuteResponse {
  advanced: number;
  from_stage: string;
  to_stage: string;
  finals_group_id: string;
}

export const useBRAdvancement = (stageId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const preview = useMutation({
    mutationFn: (teamsPerGroup?: number) =>
      apiClient.post<AdvancePreviewResponse>(
        `/api/stages/${stageId}/br/advance?preview=true`,
        teamsPerGroup ? { teamsPerGroup } : {}
      ),
    onError: (error: Error) => {
      toast({ title: 'Preview failed', description: error.message, variant: 'destructive' });
    },
  });

  const execute = useMutation({
    mutationFn: (teamsPerGroup?: number) =>
      apiClient.post<AdvanceExecuteResponse>(
        `/api/stages/${stageId}/br/advance?preview=false`,
        teamsPerGroup ? { teamsPerGroup } : {}
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['br-groups'] });
      queryClient.invalidateQueries({ queryKey: ['br-rounds'] });
      toast({ title: `${data.advanced} teams advanced to ${data.to_stage}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Advancement failed', description: error.message, variant: 'destructive' });
    },
  });

  return { preview, execute };
};

export type { QualifiedTeam, AdvancePreviewResponse, AdvanceExecuteResponse };
