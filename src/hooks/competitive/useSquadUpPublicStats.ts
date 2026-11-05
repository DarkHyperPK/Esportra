import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { competitiveApiClient as api } from '@/hooks/competitive/competitiveApiClient';
import { squadUpKeys } from './queryKeys';

export const publicStatsSchema = z.object({
  playersLive: z.number(), openLobbies: z.number(), matchesToday: z.number(), lobbiesFilledToday: z.number(),
});
export type SquadUpPublicStats = z.infer<typeof publicStatsSchema>;

/** Anonymous live counters for the public page. Fails quietly (e.g. while the feature is switched off). */
export function useSquadUpPublicStats(enabled: boolean) {
  return useQuery({
    queryKey: squadUpKeys.publicStats(),
    enabled,
    queryFn: async () => publicStatsSchema.parse(await api.get<unknown>('/api/competitive/lfg/swipe/public-stats')),
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: false,
  });
}
