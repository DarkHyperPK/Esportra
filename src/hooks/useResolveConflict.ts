import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface ResolveConflictParams {
  sessionId: string;
  mapNumber: number;
  teamAScore: number;
  teamBScore: number;
}

/**
 * Resolves a GEP result conflict by calling the game-result endpoint with
 * force: true and the chosen scores.
 */
export function useResolveConflict(showId?: string) {
  return useMutation({
    mutationFn: async ({
      sessionId,
      mapNumber,
      teamAScore,
      teamBScore,
    }: ResolveConflictParams) => {
      return apiClient.post<{ ok: boolean; resolved?: boolean }>(
        `/api/broadcast/sessions/${sessionId}/game-result`,
        { mapNumber, teamAScore, teamBScore, force: true, ...(showId ? { showId } : {}) },
      );
    },
  });
}
