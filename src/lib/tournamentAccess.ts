import { apiClient } from '@/lib/apiClient';
import type { QueryClient } from '@tanstack/react-query';
import type { TournamentAccess } from '@/types/staff';
import { invalidateOrgStaffContext } from '@/hooks/useOrgStaffContext';

export async function fetchTournamentAccess(
  slugOrId: string,
): Promise<TournamentAccess> {
  const raw = await apiClient.get<{
    tournamentId: string;
    role: string;
    permissions: string[];
    isOrganizer: boolean;
    isPlatformAdmin: boolean;
  }>(`/api/tournaments/${encodeURIComponent(slugOrId)}/access`);

  return {
    tournamentId: raw.tournamentId,
    role: (raw.role === 'admin' || raw.role === 'assigned' ? raw.role : 'none') as TournamentAccess['role'],
    permissions: raw.permissions as TournamentAccess['permissions'],
    isOrganizer: raw.isOrganizer,
    isPlatformAdmin: raw.isPlatformAdmin,
  };
}

export function invalidateTournamentAccess(
  queryClient: QueryClient,
  slugOrId?: string,
) {
  if (slugOrId) {
    void queryClient.invalidateQueries({ queryKey: ['tournament-access', slugOrId] });
  } else {
    void queryClient.invalidateQueries({ queryKey: ['tournament-access'] });
  }
}

/** @deprecated Use invalidateTournamentAccess — kept for OrganizationStaffManager callers during migration */
export function invalidateStaffAccessCaches(queryClient: QueryClient, slugOrId?: string) {
  invalidateOrgStaffContext(queryClient);
  void queryClient.invalidateQueries({ queryKey: ['tournament-dashboard'] });
  invalidateTournamentAccess(queryClient, slugOrId);
}
