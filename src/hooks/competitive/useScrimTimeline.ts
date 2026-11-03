import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { competitiveApiClient } from '@/hooks/competitive/competitiveApiClient';
import { scrimInsightsKeys } from '@/hooks/competitive/queryKeys';
import { scrimTimelineSchema } from '@/schemas/scrimTimeline';

/** One scrim map round by round, with recorded positions. Members of the two teams only; the API treats a 401 as a sign-out, so nothing is requested without a signed-in user. */
export function useScrimTimeline(sessionId: string | undefined, gameNumber: number | undefined, teamId?: string, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: scrimInsightsKeys.timeline(sessionId ?? '', gameNumber ?? 0, teamId),
    queryFn: async () => {
      const query = teamId ? `?team_id=${encodeURIComponent(teamId)}` : '';
      return scrimTimelineSchema.parse(await competitiveApiClient.get<unknown>(`/api/scrims/sessions/${sessionId}/games/${gameNumber}/timeline${query}`));
    },
    enabled: enabled && !!user?.id && !!sessionId && !!gameNumber && gameNumber > 0,
    staleTime: 60_000,
    retry: false,
  });
}
