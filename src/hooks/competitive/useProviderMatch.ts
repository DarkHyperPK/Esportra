import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { competitiveApiClient } from '@/hooks/competitive/competitiveApiClient';
import { providerMatchKeys } from '@/hooks/competitive/queryKeys';
import { providerMatchSchema } from '@/schemas/providerMatch';
import { isProviderMatchSettled } from '@/services/providerMatch/presentation';
import type { ProviderMatchDetail } from '@/types/providerMatch';

const POLL_MS = 15_000;

async function fetchProviderMatch(path: string): Promise<ProviderMatchDetail> {
  return providerMatchSchema.parse(await competitiveApiClient.get<unknown>(path));
}

/** Riot can list a custom game minutes late, so a pending check re-reads itself until the server settles. */
const pollWhileUnsettled = (query: { state: { data: ProviderMatchDetail | undefined } }) =>
  isProviderMatchSettled(query.state.data) ? false : POLL_MS;

/** Riot verification of one scrim map. Only runs for a signed-in team member looking at a map with a Riot match. */
export function useScrimProviderMatch(sessionId: string | undefined, gameNumber: number, hasRiotMatch: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: providerMatchKeys.scrimGame(sessionId ?? '', gameNumber),
    queryFn: () => fetchProviderMatch(`/api/scrims/sessions/${sessionId}/games/${gameNumber}/provider-match`),
    enabled: !!user?.id && !!sessionId && hasRiotMatch,
    staleTime: 30_000,
    retry: false,
    refetchInterval: pollWhileUnsettled,
  });
}

/** Riot verification of one tournament game. Needs a signed-in user: the API treats a 401 as a sign-out. */
export function useTournamentProviderMatch(matchId: string | undefined, gameNumber: number | undefined, hasRiotMatch: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: providerMatchKeys.tournamentGame(matchId ?? '', gameNumber ?? 0),
    queryFn: () => fetchProviderMatch(`/api/matches/${matchId}/games/${gameNumber}/provider-match`),
    enabled: !!user?.id && !!matchId && !!gameNumber && hasRiotMatch,
    staleTime: 30_000,
    retry: false,
    refetchInterval: pollWhileUnsettled,
  });
}
