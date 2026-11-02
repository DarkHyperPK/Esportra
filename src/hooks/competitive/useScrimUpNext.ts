/**
 * useScrimUpNext
 *
 * The caller's scrim action queue (offers to answer, check-in, veto, results,
 * dispute evidence). Separate from the messaging inbox.
 *
 * Keyed under ['scrims'] so NotificationContext's existing scrim invalidation
 * refreshes it when a scrim notification arrives.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { competitiveApiClient as apiClient } from '@/hooks/competitive/competitiveApiClient';
import type { ScrimUpNextResponse } from '@/types/competitive';

export const scrimUpNextKey = (userId: string | undefined, teamId?: string) =>
  ['scrims', 'up-next', userId ?? 'anon', teamId ?? 'all'] as const;

export function useScrimUpNext(teamId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: scrimUpNextKey(user?.id, teamId),
    queryFn: () => {
      const qs = teamId ? `?team_id=${encodeURIComponent(teamId)}` : '';
      return apiClient.get<ScrimUpNextResponse>(`/api/scrims/up-next${qs}`);
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    // A failed queue must never block the page it sits on.
    retry: 1,
  });
}
