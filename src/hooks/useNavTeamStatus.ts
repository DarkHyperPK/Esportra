import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { useOrgStaffContext } from '@/hooks/useOrgStaffContext';

/** Navbar badge queries — share keys with useTeamManagement for deduplication. */
export function useMyTeamsSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-teams'],
    queryFn: () => apiClient.get<unknown[]>('/api/teams/me'),
    enabled: !!user,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useMyTeamInvitesSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-team-invites'],
    queryFn: () => apiClient.get<unknown[]>('/api/teams/me/invites'),
    enabled: !!user,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** @deprecated Prefer useOrgStaffContext — thin re-export for legacy imports */
export function useStaffInvitesSummary() {
  const { invites, isLoading } = useOrgStaffContext();
  return { data: invites, isLoading };
}

/** @deprecated Prefer useOrgStaffContext — thin re-export for legacy imports */
export function useStaffAssignmentsSummary() {
  const { assignments, isLoading } = useOrgStaffContext();
  return { data: assignments, isLoading };
}
