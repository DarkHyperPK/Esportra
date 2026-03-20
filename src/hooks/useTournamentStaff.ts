import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const { data: staff = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['tournament-staff', tournamentId],
    queryFn: () => fetchTournamentStaff(tournamentId!),
    enabled: !!tournamentId,
    staleTime: 2 * 60 * 1000,
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

  const refresh = useCallback(async () => { await refetch(); }, [refetch]);

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
    refresh,
    hasPermission,
    isStaffMember,
  };
}

