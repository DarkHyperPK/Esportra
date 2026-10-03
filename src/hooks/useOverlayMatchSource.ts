import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { resolveStoredEnrichedMatch } from '@/hooks/useRiotGameDetails';
import type { MatchResultReport } from '@/hooks/useMatchResultReport';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';

interface OverlaySourceParams {
  region: string;
  /** Riot match id (Riot-sourced overlays). */
  riotMatchId: string;
  /** Esportra match id + parse id (screenshot-sourced overlays). */
  esportraMatchId: string;
  parseId: string;
}

export interface OverlayMatchSource {
  data: EnrichedRiotMatchData | undefined;
  isLoading: boolean;
  error: unknown;
  hasSource: boolean;
}

function pickOcrSnapshot(reports: MatchResultReport[], parseId: string): EnrichedRiotMatchData | null {
  const matching = reports.filter((r) => r.ocr_parse_id === parseId);
  const report = matching.find((r) => r.status === 'accepted') ?? matching[0];
  return report ? resolveStoredEnrichedMatch(report.match_data) : null;
}

/**
 * Data for the post-match overlay: a live Riot fetch, or the stored snapshot of a screenshot report.
 * Both shapes are EnrichedRiotMatchData, so the overlay renders them the same way.
 */
export function useOverlayMatchSource({ region, riotMatchId, esportraMatchId, parseId }: OverlaySourceParams): OverlayMatchSource {
  const isOcr = Boolean(esportraMatchId && parseId);

  const riot = useQuery({
    queryKey: ['riot-post-match-overlay', region, riotMatchId],
    queryFn: () => apiClient.post<EnrichedRiotMatchData>('/api/integrations/riot/enriched-match', { region, matchId: riotMatchId }),
    enabled: !isOcr && Boolean(riotMatchId),
    refetchInterval: false,
  });

  const ocr = useQuery({
    queryKey: ['match-result-reports', esportraMatchId],
    queryFn: () => apiClient.get<MatchResultReport[]>(`/api/matches/${esportraMatchId}/reports`),
    enabled: isOcr,
    select: (reports) => pickOcrSnapshot(reports, parseId),
  });

  if (!isOcr) {
    return { data: riot.data, isLoading: riot.isLoading, error: riot.error, hasSource: Boolean(riotMatchId) };
  }
  const missing = ocr.isSuccess && !ocr.data ? new Error('This screenshot report could not be found.') : null;
  return { data: ocr.data ?? undefined, isLoading: ocr.isLoading, error: ocr.error ?? missing, hasSource: true };
}
