import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { competitiveApiClient } from '@/hooks/competitive/competitiveApiClient';
import { scrimInsightsKeys } from '@/hooks/competitive/queryKeys';
import { scrimGameInsightsSchema } from '@/schemas/scrimInsights';

/**
 * One scrim map in depth. Only members of the two teams may read it, and the API treats a 401 as a sign-out,
 * so nothing is requested without a signed-in user.
 */
export function useScrimGameInsights(sessionId: string | undefined, gameNumber: number | undefined, teamId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: scrimInsightsKeys.game(sessionId ?? '', gameNumber ?? 0, teamId),
    queryFn: async () => {
      const query = teamId ? `?team_id=${encodeURIComponent(teamId)}` : '';
      return scrimGameInsightsSchema.parse(await competitiveApiClient.get<unknown>(`/api/scrims/sessions/${sessionId}/games/${gameNumber}/insights${query}`));
    },
    enabled: !!user?.id && !!sessionId && !!gameNumber && gameNumber > 0,
    staleTime: 60_000,
    retry: false,
  });
}
