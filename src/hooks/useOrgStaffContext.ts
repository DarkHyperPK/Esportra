import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

type OrgStaffAssignment = { status?: string };

export function invalidateOrgStaffContext(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['organizations', 'staff', 'invites'] });
  void queryClient.invalidateQueries({ queryKey: ['organizations', 'staff', 'assignments'] });
}

export function useOrgStaffContext() {
  const { user } = useAuth();

  const invitesQuery = useQuery({
    queryKey: ['organizations', 'staff', 'invites'],
    queryFn: () => apiClient.get<unknown[]>('/api/organizations/staff/invites'),
    enabled: !!user,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const assignmentsQuery = useQuery({
    queryKey: ['organizations', 'staff', 'assignments'],
    queryFn: () => apiClient.get<OrgStaffAssignment[]>('/api/organizations/staff/assignments'),
    enabled: !!user,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const invites = useMemo(() => invitesQuery.data ?? [], [invitesQuery.data]);
  const assignments = useMemo(() => assignmentsQuery.data ?? [], [assignmentsQuery.data]);

  const pendingInviteCount = invites.length;
  const hasActiveStaff = assignments.some((a) => a.status === 'active');

  return useMemo(
    () => ({
      invites,
      assignments,
      pendingInviteCount,
      hasActiveStaff,
      isLoading: invitesQuery.isLoading || assignmentsQuery.isLoading,
    }),
    [
      invites,
      assignments,
      pendingInviteCount,
      hasActiveStaff,
      invitesQuery.isLoading,
      assignmentsQuery.isLoading,
    ],
  );
}
