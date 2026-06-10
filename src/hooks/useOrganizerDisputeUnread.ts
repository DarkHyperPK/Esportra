import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useHub } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';

export function useOrganizerDisputeUnread(tournamentId: string | undefined, enabled = true) {
  const conn = useHub(HubPaths.Match);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!tournamentId || !enabled) {
      setUnreadCount(0);
      setPendingCount(0);
      return;
    }
    try {
      setLoading(true);
      const data = await apiClient.get<{ unread_count: number; pending_count?: number }>(
        `/api/organizer/disputes/unread-count?tournament_id=${tournamentId}`,
      );
      const pending = Math.max(0, data?.pending_count ?? data?.unread_count ?? 0);
      const unread = Math.max(0, data?.unread_count ?? pending);
      setPendingCount(pending);
      setUnreadCount(unread);
    } catch {
      setUnreadCount(0);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!tournamentId || !enabled) return;

    const handleActivity = () => {
      refresh();
    };

    conn.on('DisputeResolved', handleActivity);
    conn.on('ReportDisputed', handleActivity);
    conn.on('DisputeCommentAdded', handleActivity);

    return () => {
      conn.off('DisputeResolved', handleActivity);
      conn.off('ReportDisputed', handleActivity);
      conn.off('DisputeCommentAdded', handleActivity);
    };
  }, [tournamentId, enabled, refresh, conn]);

  return { unreadCount, pendingCount, badgeCount: pendingCount, loading, refresh };
}
