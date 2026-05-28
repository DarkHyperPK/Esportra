import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { StageCompletionStatus } from '@/types/stageCompletion';
import { normalizeStageProgressLabel } from '@/types/stageCompletion';

interface StageCompletionResponse {
  isComplete: boolean;
  alreadyAdvanced: boolean;
  progressLabel?: string;
  reason?: string;
  groupsTotal?: number;
  groupsWithCompletedRounds?: number;
  advancingTeams?: Array<{ teamId?: string; team_id?: string; teamName?: string; team_name?: string; seed: number }>;
}

function mapResponse(raw: StageCompletionResponse): StageCompletionStatus {
  return {
    isComplete: Boolean(raw.isComplete),
    alreadyAdvanced: Boolean(raw.alreadyAdvanced),
    progressLabel: normalizeStageProgressLabel(raw.progressLabel),
    reason: raw.reason,
    groupsTotal: raw.groupsTotal,
    groupsWithCompletedRounds: raw.groupsWithCompletedRounds,
    advancingTeams: (raw.advancingTeams ?? []).map((team) => ({
      team_id: team.team_id ?? team.teamId ?? '',
      team_name: team.team_name ?? team.teamName ?? '',
      seed: team.seed,
    })),
  };
}

export function stageCompletionQueryKey(stageId: string | null | undefined) {
  return ['stage-completion', stageId] as const;
}

export function useStageCompletion(
  stageId: string | null | undefined,
  options: { enabled?: boolean; refetchIntervalMs?: number | false } = {},
) {
  const { enabled = true, refetchIntervalMs = false } = options;

  const query = useQuery({
    queryKey: stageCompletionQueryKey(stageId),
    queryFn: async () => {
      const raw = await apiClient.get<StageCompletionResponse>(`/api/stages/${stageId}/completion-status`);
      return mapResponse(raw);
    },
    enabled: enabled && Boolean(stageId),
    staleTime: 15_000,
    refetchInterval: enabled && stageId ? refetchIntervalMs : false,
    refetchIntervalInBackground: Boolean(refetchIntervalMs),
  });

  return {
    completion: query.data,
    isComplete: query.data?.isComplete ?? false,
    alreadyAdvanced: query.data?.alreadyAdvanced ?? false,
    progressLabel: query.data?.progressLabel ?? 'setup',
    reason: query.data?.reason,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useInvalidateStageCompletion() {
  const queryClient = useQueryClient();
  return (stageId?: string | null) => {
    if (stageId) {
      queryClient.invalidateQueries({ queryKey: stageCompletionQueryKey(stageId) });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['stage-completion'] });
  };
}

export default useStageCompletion;
