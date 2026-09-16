import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { TournamentStandingsResponse } from '@/types/standings';

export const standingsKeys = {
    all: ['standings'] as const,
    tournament: (id: string) => [...standingsKeys.all, 'tournament', id] as const,
};

export const useTournamentStandings = (tournamentId: string) =>
    useQuery({
        queryKey: standingsKeys.tournament(tournamentId),
        queryFn: () =>
            apiClient.get<TournamentStandingsResponse>(
                `/api/tournaments/${tournamentId}/standings`,
            ),
        enabled: !!tournamentId,
        refetchInterval: 30_000,
    });
