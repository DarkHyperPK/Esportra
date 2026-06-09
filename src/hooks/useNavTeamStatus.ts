import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

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

export function useStaffInvitesSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['organizations', 'staff', 'invites'],
    queryFn: () => apiClient.get<unknown[]>('/api/organizations/staff/invites'),
    enabled: !!user,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useStaffAssignmentsSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['organizations', 'staff', 'assignments'],
    queryFn: () => apiClient.get<unknown[]>('/api/organizations/staff/assignments'),
    enabled: !!user,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
}
