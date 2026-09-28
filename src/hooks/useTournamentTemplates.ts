import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { TournamentTemplateDto } from '@/types/tournamentTemplate';

/**
 * Fetches the public tournament template list.
 * Templates are the game-curated starting points for Quick Create.
 * Mirrors backend Cache-Control: max-age=600 (10 minutes).
 */
export function useTournamentTemplates() {
  return useQuery({
    queryKey: ['tournament-templates'],
    queryFn: () => apiClient.get<TournamentTemplateDto[]>('/api/tournament-templates'),
    staleTime: 10 * 60 * 1000,
  });
}
