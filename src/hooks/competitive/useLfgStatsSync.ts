import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { competitiveApiClient as api } from './competitiveApiClient';
import { useSyncCooldown } from './useSyncCooldown';
import { refreshLfgStats, useLfgSyncTracking, type LfgSyncAttempt, type LfgSyncState } from './useLfgSyncTracking';

/** Share the saved snapshot for one hour; follow newly queued work through completion. */
export function useLfgStatsSync(listingId?: string) {
  const client = useQueryClient();
  const [attempt, setAttempt] = useState<LfgSyncAttempt | null>(null);
  const [feedback, setFeedback] = useState('');
  const { seconds, setAvailableAt } = useSyncCooldown();
  const submitting = useRef(false);
  useLfgSyncTracking(listingId, attempt, setAttempt, setFeedback, setAvailableAt);
  const path = listingId ? `/api/competitive/lfg/${listingId}/sync-stats` : '/api/competitive/game-stats/sync';
  const mutation = useMutation({ mutationFn: () => api.post<LfgSyncState>(path, {}) });

  async function sync() {
    if (submitting.current || attempt) return;
    submitting.current = true; setFeedback('');
    try {
      const result = await mutation.mutateAsync();
      setAvailableAt(Date.now() + result.retryAfterSeconds * 1000);
      if (result.status === 'cooldown' || result.status === 'cached') setFeedback(result.syncedAt ? 'Stats updated.' : 'Stats are unavailable. Try again later.');
      else setAttempt({ started: Date.now(), baseline: result.syncedAt });
      refreshLfgStats(client);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Stats could not be refreshed. Please try again.';
      setFeedback(message.includes('NO_LINKED_RIOT_ACCOUNT') ? 'Connect Riot in Account Settings to refresh your stats.' : message);
    } finally { submitting.current = false; }
  }
  return { sync, busy: mutation.isPending || !!attempt, seconds, feedback };
}
