import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { competitiveApiClient } from '@/hooks/competitive/competitiveApiClient';
import { scrimInsightsKeys } from '@/hooks/competitive/queryKeys';
import { scrimOpponentsSchema } from '@/schemas/scrimOpponents';

/** The team's scrim partners as teams. Members only; the API treats a 401 as a sign-out, so nothing is requested without a signed-in user. */
export function useScrimOpponents(teamId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: scrimInsightsKeys.opponents(teamId ?? ''),
    queryFn: async () => scrimOpponentsSchema.parse(await competitiveApiClient.get<unknown>(`/api/scrims/teams/${teamId}/opponents`)),
    enabled: !!user?.id && !!teamId,
    staleTime: 60_000,
    retry: false,
  });
}
