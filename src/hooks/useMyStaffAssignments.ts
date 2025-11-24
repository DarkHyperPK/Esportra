import { useCallback, useEffect, useState } from 'react';
import {
  fetchUserStaffAssignments,
  TournamentStaffInvite,
} from '@/lib/tournamentStaff';

export function useMyStaffAssignments(userId?: string) {
  const [assignments, setAssignments] = useState<TournamentStaffInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    if (!userId) {
      setAssignments([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUserStaffAssignments(userId);
      setAssignments(data);
    } catch (err: unknown) {
      console.error('Failed to load staff assignments', err);
      setError(err instanceof Error ? err.message : 'Unable to load assignments');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  return {
    assignments,
    loading,
    error,
    refresh: loadAssignments,
  };
}

