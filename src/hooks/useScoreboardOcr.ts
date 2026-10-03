import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { scoreboardOcrParseSchema, validateScreenshotFile } from '@/schemas/scoreboardOcrSchema';
import type { OcrReportSubmission } from '@/services/scoreboardOcr';
import type { ScoreboardOcrParse } from '@/types/scoreboardOcr';

interface ParseParams {
  file: File;
  reportedByTeamId: string;
  gameNumber: number;
}

export interface ValorantAgentOption {
  uuid: string;
  name: string;
  icon: string | null;
}

/** Reads a scoreboard screenshot on the server and submits the captain-reviewed result. */
export function useScoreboardOcr(matchId: string | undefined) {
  const queryClient = useQueryClient();

  const parse = useMutation({
    mutationFn: async ({ file, reportedByTeamId, gameNumber }: ParseParams): Promise<ScoreboardOcrParse> => {
      if (!matchId) throw new Error('Open the upload from a specific match.');
      const invalid = validateScreenshotFile(file);
      if (invalid) throw new Error(invalid);
      const form = new FormData();
      form.append('file', file);
      form.append('reportedByTeamId', reportedByTeamId);
      form.append('gameNumber', String(gameNumber));
      const raw = await apiClient.upload<unknown>(`/api/matches/${matchId}/reports/parse-screenshot`, form);
      const checked = scoreboardOcrParseSchema.safeParse(raw);
      if (!checked.success) throw new Error('The screenshot reader returned something unexpected. Enter the result manually.');
      return checked.data;
    },
  });

  const submit = useMutation({
    mutationFn: (submission: OcrReportSubmission) => {
      if (!matchId) throw new Error('Open the upload from a specific match.');
      return apiClient.post(`/api/matches/${matchId}/reports`, submission);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] }),
  });

  return { parse, submit };
}

interface AgentApiRow {
  uuid: string;
  displayName: string;
  displayIcon?: string | null;
}

/** Playable Valorant agents for the review's agent picker (public catalog, cached for the session). */
export function useValorantAgents(enabled = true) {
  return useQuery({
    queryKey: ['valorant-agents-catalog'],
    enabled,
    staleTime: Infinity,
    queryFn: async (): Promise<ValorantAgentOption[]> => {
      const response = await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true');
      if (!response.ok) throw new Error('Agent list unavailable');
      const body: { data?: AgentApiRow[] } = await response.json();
      return (body.data ?? [])
        .map((agent) => ({ uuid: agent.uuid, name: agent.displayName, icon: agent.displayIcon ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}
