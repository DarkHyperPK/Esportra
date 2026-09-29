import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface ActiveMatch {
  id: string;
  match_number: number;
  round_index: number;
  bracket_type: string;
  status: string;
  best_of: number;
  scheduled_time: string | null;
  started_at: string | null;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number;
  team2_score: number;
  team1_seed: number | null;
  team2_seed: number | null;
  team1_name: string | null;
  team1_logo: string | null;
  team1_kind: string | null;
  team2_name: string | null;
  team2_logo: string | null;
  team2_kind: string | null;
  stage_name: string;
  stage_id: string;
}

export function useActiveMatches(tournamentId: string, enabled = true) {
  return useQuery({
    queryKey: ['active-matches', tournamentId],
    queryFn: () =>
      apiClient.get<ActiveMatch[]>(
        `/api/tournaments/${tournamentId}/active-matches`,
      ),
    refetchInterval: 30_000,
    enabled: enabled && !!tournamentId,
  });
}
