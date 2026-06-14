import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import type { TournamentStaffInvite } from '@/lib/tournamentStaff';

type TournamentRef = NonNullable<TournamentStaffInvite['tournament']>;

function parseAssignmentTournament(
  raw: TournamentStaffInvite['tournament'],
): TournamentRef | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as TournamentRef;
    } catch {
      return null;
    }
  }
  return raw;
}

/** True when a my-assignments row covers the tournament slug or id in the route. */
export function assignmentMatchesTournament(
  assignment: TournamentStaffInvite,
  tournamentSlugOrId: string,
): boolean {
  const normalized = tournamentSlugOrId.trim().toLowerCase();
  if (!normalized) return false;

  const tournament = parseAssignmentTournament(assignment.tournament);
  const slug = tournament?.slug?.trim().toLowerCase();
  if (slug && slug === normalized) return true;

  const ids = new Set<string>();
  if (tournament?.id) ids.add(String(tournament.id).toLowerCase());
  if (assignment.tournament_id) ids.add(String(assignment.tournament_id).toLowerCase());

  return ids.has(normalized);
}

/** Tournament-scoped staff assignments for route UX gates (backend remains source of truth). */
export function useTournamentStaffAccess(tournamentSlug?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tournaments', 'staff', 'my-assignments', tournamentSlug ?? 'none'],
    queryFn: () =>
      apiClient.get<TournamentStaffInvite[]>('/api/tournaments/staff/my-assignments'),
    enabled: !!user && !!tournamentSlug,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: true,
  });
}

export function hasTournamentStaffAccess(
  assignments: TournamentStaffInvite[] | undefined,
  tournamentSlug?: string,
): boolean {
  if (!tournamentSlug || !assignments?.length) return false;
  return assignments.some((assignment) => assignmentMatchesTournament(assignment, tournamentSlug));
}
