import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

export interface AnalyticsData {
    totalTournaments: number;
    totalParticipants: number;
    activeTournaments: number;
    upcomingTournaments: number;
    totalPrizePool: number;
    monthlyParticipation: { name: string; participants: number }[];
    gameDistribution: { name: string; value: number }[];
}

interface OrganizerStatsResponse {
    totalTournaments: number;
    activeTournaments: number;
    upcomingTournaments: number;
    totalPrizePool: number;
    totalParticipants: number;
    gameDistribution: { game: string; count: number }[];
    monthlyParticipation: { month: string; participants: number }[];
}

export const useOrganizerStats = () => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['organizer-analytics', user?.id],
        queryFn: async (): Promise<AnalyticsData> => {
            // Fetch both stats and tournaments list so we can infer active/upcoming with date logic
            const [stats, rawTournaments] = await Promise.all([
                apiClient.get<OrganizerStatsResponse>('/api/organizer/stats').catch(() => null),
                apiClient.get<any>(`/api/tournaments?organizer_id=${user!.id}`).catch(() => []),
            ]);

            const tournaments: any[] = Array.isArray(rawTournaments)
                ? rawTournaments
                : (rawTournaments?.items || rawTournaments?.data || []);

            // Compute active/upcoming with the same date-inference used in TournamentsList
            const now = new Date();
            let active = 0;
            let upcoming = 0;
            for (const t of tournaments) {
                const s = t.status as string;
                const started = new Date(t.start_date) <= now;

                if (s === 'ongoing' || (['open', 'closed'].includes(s) && started)) {
                    active++;
                } else if (['draft', 'published', 'open', 'closed'].includes(s) && !started) {
                    upcoming++;
                }
            }

            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            return {
                totalTournaments:    stats?.totalTournaments ?? tournaments.length,
                totalParticipants:   stats?.totalParticipants ?? 0,
                activeTournaments:   active,
                upcomingTournaments: upcoming,
                totalPrizePool:      stats?.totalPrizePool ?? 0,
                monthlyParticipation: (stats?.monthlyParticipation ?? []).map(m => ({
                    name:         monthNames[parseInt(m.month.split('-')[1], 10) - 1] || m.month,
                    participants: m.participants,
                })),
                gameDistribution: (stats?.gameDistribution ?? []).map(g => ({
                    name:  g.game,
                    value: g.count,
                })),
            };
        },
        enabled: !!user?.id,
        staleTime: 60_000,
    });
};
