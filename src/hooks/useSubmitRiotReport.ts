import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { resolveValShardRegion } from '@/hooks/useRiotGameDetails';
import { useMatchResultReport } from '@/hooks/useMatchResultReport';
import { riotReportBody, type RiotReportContext } from '@/services/riotReport/riotReport';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import type { RiotMatchCandidate } from '@/types/riotMatchCandidate';

/**
 * Reports a Riot game as the result: the way "Auto-fetch" does, and the way a screenshot of a game
 * found in Riot history is reported. Everything comes from Riot's record.
 */
export function useSubmitRiotReport(matchId: string | undefined, gameNumber: number) {
  const { submitReport } = useMatchResultReport(matchId, gameNumber, { subscribeRealtime: false });
  return useMutation({
    mutationFn: async ({ candidate, ctx }: { candidate: RiotMatchCandidate; ctx: RiotReportContext }) => {
      const enrichedSnapshot = await apiClient.post<EnrichedRiotMatchData>('/api/integrations/riot/enriched-match', {
        matchId: candidate.id,
        region: resolveValShardRegion(candidate.matchInfo?.region),
      });
      const body = riotReportBody(candidate, ctx);
      return submitReport.mutateAsync({ ...body, matchData: { ...body.matchData, enrichedSnapshot } });
    },
  });
}
