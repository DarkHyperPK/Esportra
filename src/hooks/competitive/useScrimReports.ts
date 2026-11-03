import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { competitiveApiClient } from '@/hooks/competitive/competitiveApiClient';
import { scrimInsightsKeys } from '@/hooks/competitive/queryKeys';
import { scrimPlayerReportSchema, scrimTeamReportSchema } from '@/schemas/scrimReport';

/**
 * The team report: charts-ready series and highlights over the team's verified scrim maps. Members of the team only, and the API treats a 401
 * as a sign-out, so nothing is requested without a signed-in user. `enabled` lets a tab fetch only when it is opened.
 */
export function useScrimTeamReport(teamId: string | undefined, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: scrimInsightsKeys.teamReport(teamId ?? ''),
    queryFn: async () => scrimTeamReportSchema.parse(await competitiveApiClient.get<unknown>(`/api/scrims/teams/${teamId}/report`)),
    enabled: enabled && !!user?.id && !!teamId,
    staleTime: 60_000,
    retry: false,
  });
}

/** One player's report. Staff may open anyone's; a member only their own (the API refuses the rest). */
export function useScrimPlayerReport(teamId: string | undefined, userId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: scrimInsightsKeys.playerReport(teamId ?? '', userId ?? ''),
    queryFn: async () => scrimPlayerReportSchema.parse(await competitiveApiClient.get<unknown>(`/api/scrims/teams/${teamId}/players/${userId}/report`)),
    enabled: !!user?.id && !!teamId && !!userId,
    staleTime: 60_000,
    retry: false,
  });
}
