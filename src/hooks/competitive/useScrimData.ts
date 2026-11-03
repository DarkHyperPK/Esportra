import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { competitiveApiClient } from '@/hooks/competitive/competitiveApiClient';
import { scrimDataKeys } from '@/hooks/competitive/queryKeys';
import { scrimDataSchema } from '@/schemas/scrimData';

/**
 * A team's own scrim data. Only team members may read it, and the API treats a 401 as a sign-out,
 * so nothing is requested without a signed-in user and a team.
 */
export function useScrimData(teamId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: scrimDataKeys.team(teamId ?? ''),
    queryFn: async () => scrimDataSchema.parse(await competitiveApiClient.get<unknown>(`/api/scrims/teams/${teamId}/data`)),
    enabled: !!user?.id && !!teamId,
    staleTime: 60_000,
    retry: false,
  });
}
