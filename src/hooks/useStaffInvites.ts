import { useCallback, useEffect, useState } from 'react';
import {
  fetchPendingStaffInvites,
  respondToStaffInvite,
  TournamentStaffInvite,
} from '@/lib/tournamentStaff';

export function useStaffInvites(userId?: string) {
  const [invites, setInvites] = useState<TournamentStaffInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    if (!userId) {
      setInvites([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchPendingStaffInvites(userId);
      setInvites(data);
    } catch (err: unknown) {
      console.error('Failed to load staff invites', err);
      setError(err instanceof Error ? err.message : 'Unable to load invites');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleRespond = useCallback(
    async (inviteId: string, accept: boolean) => {
      await respondToStaffInvite({ inviteId, accept });
      await loadInvites();
    },
    [loadInvites]
  );

  return {
    invites,
    loading,
    error,
    refresh: loadInvites,
    respond: handleRespond,
  };
}

