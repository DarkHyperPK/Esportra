import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchTournamentAccess } from '@/lib/tournamentAccess';
import {
  canAccessPermission,
  hasStaffOnlyAccess,
  hasTournamentAccess,
  isStaffAdmin,
  type StaffPermission,
  type TournamentAccess,
} from '@/types/staff';

export function useTournamentAccess(slugOrId?: string) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['tournament-access', slugOrId ?? 'none'],
    queryFn: () => fetchTournamentAccess(slugOrId!),
    enabled: Boolean(user && slugOrId),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: true,
  });

  const access = query.data;

  const can = useCallback(
    (permission: StaffPermission) => canAccessPermission(access, permission),
    [access],
  );

  return {
    ...query,
    access,
    can,
    hasAccess: hasTournamentAccess(access),
    hasStaffOnlyAccess: hasStaffOnlyAccess(access),
    isStaffAdmin: isStaffAdmin(access),
  };
}

export type { TournamentAccess };
