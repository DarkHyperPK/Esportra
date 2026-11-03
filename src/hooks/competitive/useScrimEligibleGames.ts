import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { competitiveApiClient } from '@/hooks/competitive/competitiveApiClient';

const schema = z.object({ teamId: z.string(), games: z.array(z.string()) });

/** Games the team has a full roster for: only those can be listed for scrims (the API enforces it too). */
export function useScrimEligibleGames(teamId: string | undefined) {
  return useQuery({
    queryKey: ['scrims', 'eligible-games', teamId ?? ''] as const,
    queryFn: async () => schema.parse(await competitiveApiClient.get<unknown>(`/api/scrims/teams/${teamId}/eligible-games`)).games,
    enabled: !!teamId,
    staleTime: 60_000,
  });
}
