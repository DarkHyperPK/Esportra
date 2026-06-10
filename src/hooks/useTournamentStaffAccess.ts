import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import type { TournamentStaffInvite } from '@/lib/tournamentStaff';

/** Tournament-scoped staff assignments for route UX gates (backend remains source of truth). */
export function useTournamentStaffAccess(tournamentSlug?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tournaments', 'staff', 'my-assignments', tournamentSlug ?? 'none'],
    queryFn: () =>
      apiClient.get<TournamentStaffInvite[]>('/api/tournaments/staff/my-assignments'),
    enabled: !!user && !!tournamentSlug,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
    select: (assignments) => {
      if (!tournamentSlug) return [];
      const normalized = tournamentSlug.toLowerCase();
      return assignments.filter((assignment) => {
        const slug = assignment.tournament?.slug?.toLowerCase();
        const id = assignment.tournament?.id;
        return slug === normalized || id === tournamentSlug;
      });
    },
  });
}

export function hasTournamentStaffAccess(
  assignments: TournamentStaffInvite[] | undefined,
  tournamentSlug?: string,
): boolean {
  if (!tournamentSlug || !assignments?.length) return false;
  const normalized = tournamentSlug.toLowerCase();
  return assignments.some((assignment) => {
    const slug = assignment.tournament?.slug?.toLowerCase();
    const id = assignment.tournament?.id;
    return slug === normalized || id === tournamentSlug;
  });
}
