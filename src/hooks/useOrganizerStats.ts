import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

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
            const stats = await apiClient.get<OrganizerStatsResponse>('/api/organizer/stats');

            // Map server response to existing AnalyticsData shape
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            return {
                totalTournaments:    stats.totalTournaments,
                totalParticipants:   stats.totalParticipants,
                activeTournaments:   stats.activeTournaments,
                upcomingTournaments: stats.upcomingTournaments,
                totalPrizePool:      stats.totalPrizePool,
                monthlyParticipation: (stats.monthlyParticipation ?? []).map(m => ({
                    name:         monthNames[parseInt(m.month.split('-')[1], 10) - 1] || m.month,
                    participants: m.participants,
                })),
                gameDistribution: (stats.gameDistribution ?? []).map(g => ({
                    name:  g.game,
                    value: g.count,
                })),
            };
        },
        enabled: !!user?.id,
        staleTime: 60_000,
    });
};
