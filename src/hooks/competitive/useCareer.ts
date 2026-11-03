import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { competitiveApiClient } from '@/hooks/competitive/competitiveApiClient';
import { careerKeys } from '@/hooks/competitive/queryKeys';
import { careerGamesPageSchema, playerCareerSchema, teamCareerSchema } from '@/schemas/career';
import type { CareerGamesPage } from '@/types/career';

const GAME = 'valorant';
const STALE_MS = 60_000;

async function fetchGames(path: string, before: string | null): Promise<CareerGamesPage> {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  return careerGamesPageSchema.parse(await competitiveApiClient.get<unknown>(`${path}${query}`));
}

/**
 * A player's career. The API treats a 401 as a sign-out, so nothing is requested for a signed-out visitor.
 * The summary and the game list load side by side, not one after the other.
 */
export function usePlayerCareer(userId: string | undefined) {
  const { user } = useAuth();
  const enabled = !!user?.id && !!userId;
  const summary = useQuery({
    queryKey: careerKeys.player(userId ?? '', GAME),
    queryFn: async () => playerCareerSchema.parse(await competitiveApiClient.get<unknown>(`/api/competitive/players/${userId}/career?game=${GAME}`)),
    enabled,
    staleTime: STALE_MS,
  });
  const games = useInfiniteQuery({
    queryKey: careerKeys.playerGames(userId ?? '', GAME),
    queryFn: ({ pageParam }) => fetchGames(`/api/competitive/players/${userId}/career/matches`, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextBefore : undefined),
    enabled,
    staleTime: STALE_MS,
  });
  return { signedIn: !!user?.id, summary, games };
}

/** A team's career record. Same rules as the player's. */
export function useTeamCareer(teamId: string | undefined) {
  const { user } = useAuth();
  const enabled = !!user?.id && !!teamId;
  const summary = useQuery({
    queryKey: careerKeys.team(teamId ?? ''),
    queryFn: async () => teamCareerSchema.parse(await competitiveApiClient.get<unknown>(`/api/competitive/teams/${teamId}/career`)),
    enabled,
    staleTime: STALE_MS,
  });
  const games = useInfiniteQuery({
    queryKey: careerKeys.teamGames(teamId ?? ''),
    queryFn: ({ pageParam }) => fetchGames(`/api/competitive/teams/${teamId}/career/matches`, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextBefore : undefined),
    enabled,
    staleTime: STALE_MS,
  });
  return { signedIn: !!user?.id, summary, games };
}
