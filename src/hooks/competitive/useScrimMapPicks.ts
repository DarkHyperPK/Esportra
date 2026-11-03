import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { competitiveApiClient } from '@/hooks/competitive/competitiveApiClient';
import { scrimInsightsKeys } from '@/hooks/competitive/queryKeys';
import { scrimMapPicksSchema } from '@/schemas/scrimMapPicks';

/**
 * What a team and its opponents picked and banned in scrim map vetoes. Members only, and the API treats a 401 as a sign-out,
 * so nothing is requested without a signed-in user. `enabled` lets the Map picks tab fetch only when it is opened.
 */
export function useScrimMapPicks(teamId: string | undefined, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: scrimInsightsKeys.mapPicks(teamId ?? ''),
    queryFn: async () => scrimMapPicksSchema.parse(await competitiveApiClient.get<unknown>(`/api/scrims/teams/${teamId}/map-picks`)),
    enabled: enabled && !!user?.id && !!teamId,
    staleTime: 60_000,
    retry: false,
  });
}
