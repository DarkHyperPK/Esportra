import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { MatchDetailsPayload } from '@/types/matchDetails';
import { hasRiotDerivedDetails } from '@/types/riotMatchDetails';

const normalizeMatchId = (matchId: string) => matchId.replace(/^(db-|wb-|lb-)/, '');

export function useRiotGameDetails(
  matchId: string,
  gameNumber: number,
  storedDetails: MatchDetailsPayload | null,
  riotMatchId?: string | null,
) {
  const needsFetch = Boolean(
    riotMatchId
    && gameNumber > 0
    && !hasRiotDerivedDetails(storedDetails),
  );

  return useQuery({
    queryKey: ['riot-game-details', normalizeMatchId(matchId), gameNumber],
    queryFn: async () => {
      const rawMatchId = normalizeMatchId(matchId);
      return apiClient.get<MatchDetailsPayload>(
        `/api/matches/${rawMatchId}/games/${gameNumber}/riot-details`,
      );
    },
    enabled: needsFetch,
    staleTime: 5 * 60 * 1000,
  });
}

export function mergeMatchDetails(
  stored: MatchDetailsPayload | null,
  fetched?: MatchDetailsPayload | null,
): MatchDetailsPayload | null {
  if (!stored && !fetched) return null;
  return {
    ...(stored ?? {}),
    ...(fetched ?? {}),
    players: fetched?.players?.length ? fetched.players : stored?.players,
    roundTimeline: fetched?.roundTimeline?.length ? fetched.roundTimeline : stored?.roundTimeline,
    economyTimeline: fetched?.economyTimeline?.length ? fetched.economyTimeline : stored?.economyTimeline,
  };
}
