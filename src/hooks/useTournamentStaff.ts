import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchTournamentStaff,
  StaffPermission,
  TournamentStaffRecord,
} from '@/lib/tournamentStaff';

interface UseTournamentStaffResult {
  staff: TournamentStaffRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasPermission: (userId: string | null | undefined, permission: StaffPermission) => boolean;
  isStaffMember: (userId: string | null | undefined) => boolean;
}

export function useTournamentStaff(tournamentId?: string): UseTournamentStaffResult {
  const [staff, setStaff] = useState<TournamentStaffRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    if (!tournamentId) {
      setStaff([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchTournamentStaff(tournamentId);
      setStaff(data);
    } catch (err: unknown) {
      console.error('Failed to load tournament staff', err);
      setError(err instanceof Error ? err.message : 'Unable to load staff');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const permissionIndex = useMemo(() => {
    return staff.reduce<Record<string, Set<StaffPermission>>>((acc, member) => {
      if (!acc[member.user_id]) {
        acc[member.user_id] = new Set();
      }
      member.permissions.forEach((perm) => acc[member.user_id].add(perm));
      return acc;
    }, {});
  }, [staff]);

  const hasPermission = useCallback(
    (userId: string | null | undefined, permission: StaffPermission) => {
      if (!userId) return false;
      return permissionIndex[userId]?.has(permission) ?? false;
    },
    [permissionIndex]
  );

  const isStaffMember = useCallback(
    (userId: string | null | undefined) => {
      if (!userId) return false;
      return Boolean(permissionIndex[userId]);
    },
    [permissionIndex]
  );

  return {
    staff,
    loading,
    error,
    refresh: loadStaff,
    hasPermission,
    isStaffMember,
  };
}

