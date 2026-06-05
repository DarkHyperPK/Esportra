import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

function extractErrorMessage(error: Error): string {
  if (error instanceof ApiError && typeof error.body === 'object' && error.body !== null) {
    const body = error.body as Record<string, unknown>;
    if (typeof body.error === 'string') return body.error;
  }
  return error.message;
}

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

interface AdvanceRequest {
  teamsPerGroup?: number;
}

export const useBRAdvancement = (stageId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const preview = useMutation({
    mutationFn: (body: AdvanceRequest = {}) =>
      apiClient.post<AdvancePreviewResponse>(
        `/api/stages/${stageId}/br/advance?preview=true`,
        body,
      ),
    onError: (error: Error) => {
      toast({ title: 'Preview failed', description: extractErrorMessage(error), variant: 'destructive' });
    },
  });

  const execute = useMutation({
    mutationFn: (body: AdvanceRequest = {}) =>
      apiClient.post<AdvanceExecuteResponse>(
        `/api/stages/${stageId}/br/advance?preview=false`,
        body,
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['br-groups'] });
      queryClient.invalidateQueries({ queryKey: ['br-rounds'] });
      queryClient.invalidateQueries({ queryKey: ['br-group-teams-batch'] });
      toast({ title: `${data.advanced} teams advanced to ${data.to_stage}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Advancement failed', description: extractErrorMessage(error), variant: 'destructive' });
    },
  });

  return { preview, execute };
};

export type { QualifiedTeam, AdvancePreviewResponse, AdvanceExecuteResponse };
