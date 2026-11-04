import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/apiClient';
import { useEventLicenseQuota } from '@/hooks/useEventLicenseQuota';

interface TournamentOrganizerProResponse {
  tournamentId: string;
  isOrganizerPro: boolean;
}

export const tournamentOrganizerProQueryKey = (tournamentId: string | null | undefined) =>
  ['tournament-organizer-pro', tournamentId ?? null] as const;

/**
 * Organizer Pro state for one tournament.
 *
 * Pro is licensed per tournament, and the backend gates (custom veto, Discord DMs,
 * broadcast) check the tournament's license, not the user. This hook reads the
 * same per-tournament rule from GET /api/tournaments/{id}/organizer-pro.
 *
 * While that endpoint is not deployed (404), it falls back to the account-level
 * flag from the quota endpoint. Any other failure fails open: the backend still
 * enforces the gate, so the UI never blocks an organizer on a network error.
 */
export function useTournamentOrganizerPro(tournamentId: string | null | undefined) {
  const { data, isLoading, error } = useQuery<TournamentOrganizerProResponse>({
    queryKey: tournamentOrganizerProQueryKey(tournamentId),
    queryFn: () =>
      apiClient.get<TournamentOrganizerProResponse>(
        `/api/tournaments/${encodeURIComponent(tournamentId ?? '')}/organizer-pro`,
      ),
    enabled: Boolean(tournamentId),
    staleTime: 60_000,
    gcTime: 120_000,
    retry: (failureCount, err) => !(err instanceof ApiError && err.status === 404) && failureCount < 1,
  });

  const endpointMissing = error instanceof ApiError && error.status === 404;
  const accountLevel = useEventLicenseQuota();

  if (endpointMissing) {
    return { isOrganizerPro: accountLevel.isOrganizerPro, isLoading: accountLevel.isLoading };
  }

  return {
    isOrganizerPro: data?.isOrganizerPro ?? true,
    isLoading: Boolean(tournamentId) && isLoading,
  };
}
