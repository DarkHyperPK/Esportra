import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchUserStaffAssignments,
  TournamentStaffInvite,
} from '@/lib/tournamentStaff';

export function useMyStaffAssignments(userId?: string) {
  const { data: assignments = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['my-staff-assignments'],
    queryFn: () => fetchUserStaffAssignments(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

  const refresh = useCallback(async () => { await refetch(); }, [refetch]);

  return {
    assignments,
    loading,
    error,
    refresh,
  };
}

