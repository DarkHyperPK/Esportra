import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import type { MatchDetailsPayload } from '@/types/matchDetails';

export function resolveValShardRegion(region?: string | null): string {
  const normalized = region?.toLowerCase() ?? '';
  if (normalized === 'na' || normalized === 'br' || normalized === 'latam' || normalized === 'americas') {
    return 'na';
  }
  if (normalized === 'ap' || normalized === 'kr' || normalized === 'asia') {
    return 'ap';
  }
  return 'eu';
}

export function resolveStoredEnrichedMatch(
  details?: MatchDetailsPayload | null,
): EnrichedRiotMatchData | null {
  if (!details) return null;
  if (details.enrichedSnapshot) return details.enrichedSnapshot;

  const candidate = details as MatchDetailsPayload & EnrichedRiotMatchData;
  if (Array.isArray(candidate.teams) && Array.isArray(candidate.players) && candidate.matchInfo) {
    return candidate;
  }

  return null;
}

export function useEnrichedRiotMatch(
  riotMatchId?: string | null,
  region?: string | null,
  enabled = true,
) {
  const shardRegion = resolveValShardRegion(region);

  return useQuery({
    queryKey: ['riot-enriched-match', riotMatchId, shardRegion],
    queryFn: () => apiClient.post<EnrichedRiotMatchData>('/api/integrations/riot/enriched-match', {
      matchId: riotMatchId,
      region: shardRegion,
    }),
    enabled: enabled && Boolean(riotMatchId),
    staleTime: 10 * 60 * 1000,
  });
}

export function pickEnrichedTargetPuuid(
  enriched: EnrichedRiotMatchData,
  preferredTeamSide?: 'Blue' | 'Red' | null,
): string | null {
  const players = enriched.players ?? [];
  if (!players.length) return null;

  const pool = preferredTeamSide
    ? players.filter((player) => player.teamId === preferredTeamSide)
    : players;

  const ranked = [...(pool.length ? pool : players)].sort((left, right) => {
    const leftAcs = enriched.enrichedPlayers?.find((entry) => entry.puuid === left.puuid)?.acs
      ?? Math.round(left.stats.score / Math.max(1, left.stats.roundsPlayed ?? 1));
    const rightAcs = enriched.enrichedPlayers?.find((entry) => entry.puuid === right.puuid)?.acs
      ?? Math.round(right.stats.score / Math.max(1, right.stats.roundsPlayed ?? 1));

    if (rightAcs !== leftAcs) return rightAcs - leftAcs;
    return right.stats.kills - left.stats.kills;
  });

  return ranked[0]?.puuid ?? null;
}
