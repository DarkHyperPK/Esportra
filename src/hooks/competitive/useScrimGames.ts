import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { resolveValShardRegion } from '@/hooks/useRiotGameDetails';
import { riotReportBody, type RiotReportContext } from '@/services/riotReport/riotReport';
import { toReportBody, toScrimGame, toScrimGames, type RawScrimGame, type RawScrimGames } from '@/services/scrimGames';
import { scrimKeys } from '@/hooks/competitive/useScrims';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import type { ReportScrimGameInput, ScrimGame, ScrimGamesResponse } from '@/types/competitive';
import type { RiotMatchCandidate } from '@/types/riotMatchCandidate';

export const scrimGameKeys = {
  list: (sessionId: string) => ['scrims', 'games', sessionId] as const,
};

/** The maps of a scrim series with their reports, confirmations and scoreboards. */
export function useScrimGames(sessionId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: scrimGameKeys.list(sessionId ?? ''),
    enabled: enabled && !!sessionId,
    refetchInterval: 20_000,
    queryFn: async (): Promise<ScrimGamesResponse> =>
      toScrimGames(await apiClient.get<RawScrimGames>(`/api/scrims/sessions/${sessionId}/games`)),
  });
}

/** A change to a map also changes the session (series score, status) and the queue. */
function useRefreshScrim(sessionId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: scrimGameKeys.list(sessionId) });
    void qc.invalidateQueries({ queryKey: scrimKeys.session(sessionId) });
    void qc.invalidateQueries({ queryKey: ['scrims', 'sessions'] });
    void qc.invalidateQueries({ queryKey: ['scrims', 'up-next'] });
  };
}

export function useReportScrimGame(sessionId: string) {
  const refresh = useRefreshScrim(sessionId);
  return useMutation({
    mutationFn: async (input: ReportScrimGameInput): Promise<ScrimGame> =>
      toScrimGame(await apiClient.post<RawScrimGame>(
        `/api/scrims/sessions/${sessionId}/games/${input.gameNumber}/report`,
        toReportBody(input),
      )),
    onSuccess: refresh,
  });
}

/** Reports a Riot game as the map's result, with Riot's full scoreboard attached. */
export function useReportScrimGameFromRiot(sessionId: string) {
  const report = useReportScrimGame(sessionId);
  return useMutation({
    mutationFn: async ({ candidate, ctx }: { candidate: RiotMatchCandidate; ctx: RiotReportContext }) => {
      const enrichedSnapshot = await apiClient.post<EnrichedRiotMatchData>('/api/integrations/riot/enriched-match', {
        matchId: candidate.id,
        region: resolveValShardRegion(candidate.matchInfo?.region),
      });
      const body = riotReportBody(candidate, ctx);
      return report.mutateAsync({
        gameNumber: body.gameNumber,
        reportedByTeamId: body.reportedByTeamId,
        team1Score: body.team1Score,
        team2Score: body.team2Score,
        source: 'riot',
        riotMatchId: body.riotMatchId,
        mapName: body.mapName,
        mapId: body.mapId,
        matchData: { ...body.matchData, source: 'riot', enrichedSnapshot },
        screenshotUrls: body.screenshotUrls,
      });
    },
  });
}

export function useConfirmScrimGame(sessionId: string) {
  const refresh = useRefreshScrim(sessionId);
  return useMutation({
    mutationFn: async (gameNumber: number): Promise<ScrimGame> =>
      toScrimGame(await apiClient.post<RawScrimGame>(`/api/scrims/sessions/${sessionId}/games/${gameNumber}/confirm`, {})),
    onSuccess: refresh,
  });
}

export function useDisputeScrimGame(sessionId: string) {
  const refresh = useRefreshScrim(sessionId);
  return useMutation({
    mutationFn: async (input: { gameNumber: number; raisedByTeamId: string; reason: string; evidenceUrls?: string[] }): Promise<ScrimGame> =>
      toScrimGame(await apiClient.post<RawScrimGame>(
        `/api/scrims/sessions/${sessionId}/games/${input.gameNumber}/dispute`,
        { raised_by_team_id: input.raisedByTeamId, reason: input.reason, evidence_urls: input.evidenceUrls },
      )),
    onSuccess: refresh,
  });
}
