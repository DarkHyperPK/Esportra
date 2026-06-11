import type { QueryClient } from '@tanstack/react-query';
import { matchRoomStateQueryKey } from '@/hooks/useMatchRoomState';
import {
  matchCheckinsQueryKey,
  matchResultReportsQueryKey,
  matchTimeProposalsQueryKey,
} from '@/hooks/useMatchRoomRealtime';
import { toRawMatchId } from '@/utils/bracketMatchId';

export interface MatchLifecycleScope {
  matchId?: string | null;
  versionId?: string | null;
}

/**
 * Invalidate every client cache surface that derives match room or bracket state.
 * Call after score saves, status changes, disputes, check-ins, and bracket updates.
 */
export function invalidateMatchLifecycleQueries(
  queryClient: QueryClient,
  scope: MatchLifecycleScope,
): void {
  const rawId = scope.matchId ? toRawMatchId(scope.matchId) : undefined;

  if (rawId) {
    void queryClient.invalidateQueries({ queryKey: matchRoomStateQueryKey(rawId) });
    void queryClient.invalidateQueries({ queryKey: ['organizer-match', rawId] });
    void queryClient.invalidateQueries({ queryKey: matchCheckinsQueryKey(rawId) });
    void queryClient.invalidateQueries({ queryKey: matchTimeProposalsQueryKey(rawId) });
    void queryClient.invalidateQueries({ queryKey: matchResultReportsQueryKey(rawId) });
    void queryClient.invalidateQueries({ queryKey: ['match-dispute', rawId] });
    void queryClient.invalidateQueries({ queryKey: ['match-games', rawId] });
    // Veto hooks may key by raw or prefixed id depending on caller
    void queryClient.invalidateQueries({ queryKey: ['match-veto', rawId] });
    void queryClient.invalidateQueries({ queryKey: ['match-veto', `db-${rawId}`] });
  }

  if (scope.versionId) {
    void queryClient.invalidateQueries({ queryKey: ['bracket-graph', scope.versionId] });
    void queryClient.invalidateQueries({
      queryKey: ['captain-organizer-graph', scope.versionId],
    });
  } else {
    void queryClient.invalidateQueries({ queryKey: ['bracket-graph'] });
  }

  void queryClient.invalidateQueries({ queryKey: ['captain-all-matches'] });
  void queryClient.invalidateQueries({ queryKey: ['bracket'] });
}
