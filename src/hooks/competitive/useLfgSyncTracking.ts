import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { competitiveApiClient as api } from './competitiveApiClient';
import { lfgKeys } from './queryKeys';

export interface LfgSyncState { status: string | null; retryAfterSeconds: number; syncedAt: string | null }
export interface LfgSyncAttempt { started: number; baseline: string | null }

export function refreshLfgStats(client: QueryClient) {
  void client.invalidateQueries({ queryKey: lfgKeys.all(), predicate: query => query.queryKey[1] !== 'sync-state' });
  void client.invalidateQueries({ queryKey: ['my-game-stats', 'valorant'] });
}

function completion(data: LfgSyncState | undefined, baseline: string | null) {
  if (data?.status === 'error' || data?.status === 'unlinked') return 'Stats could not be refreshed. Please try again.';
  const changed = !!data?.syncedAt && Date.parse(data.syncedAt) !== Date.parse(baseline ?? '');
  if (data?.status === 'cached' || (['complete', 'partial'].includes(data?.status ?? '') && changed))
    return data?.syncedAt ? 'Stats updated.' : 'Stats are unavailable. Try again later.';
  return null;
}

export function useLfgSyncTracking(listingId: string | undefined, attempt: LfgSyncAttempt | null,
  finish: (value: LfgSyncAttempt | null) => void, feedback: (value: string) => void, availableAt: (value: number) => void) {
  const client = useQueryClient();
  const state = useQuery({
    queryKey: lfgKeys.syncState(listingId),
    queryFn: () => api.get<LfgSyncState>(listingId ? `/api/competitive/lfg/${listingId}/stats-sync` : '/api/competitive/game-stats/sync'),
    enabled: !!attempt, refetchInterval: attempt ? 5000 : false, retry: false,
  });
  useEffect(() => {
    if (!attempt) return;
    const timer = window.setTimeout(() => { finish(null); feedback('Sync is taking longer than usual. Check back shortly.'); }, Math.max(0, 120_000 - (Date.now() - attempt.started)));
    return () => window.clearTimeout(timer);
  }, [attempt, finish, feedback]);
  useEffect(() => {
    if (!attempt) return;
    const error = state.isError && state.errorUpdatedAt >= attempt.started;
    if (!error && state.dataUpdatedAt < attempt.started) return;
    if (state.data?.retryAfterSeconds) availableAt(Date.now() + state.data.retryAfterSeconds * 1000);
    const result = error ? 'Sync status could not load. Check back shortly.' : completion(state.data, attempt.baseline);
    if (result) { finish(null); feedback(result); refreshLfgStats(client); }
  }, [attempt, state.data, state.dataUpdatedAt, state.isError, state.errorUpdatedAt, client, availableAt, finish, feedback]);
}
