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
 *
 * NOTE: The ResultConflict SignalR event does not currently include sessionId
 * (backend gap). This hook works correctly when sessionId is provided.
 * The frontend displays a graceful error when sessionId is null.
 */
export function useResolveConflict() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      mapNumber,
      teamAScore,
      teamBScore,
    }: ResolveConflictParams) => {
      return apiClient.post<{ ok: boolean; resolved?: boolean }>(
        `/api/broadcast/sessions/${sessionId}/game-result`,
        { mapNumber, teamAScore, teamBScore, force: true },
      );
    },
  });
}
