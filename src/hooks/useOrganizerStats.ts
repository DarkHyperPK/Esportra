import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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

export const useOrganizerStats = () => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['organizer-analytics', user?.id],
        queryFn: async (): Promise<AnalyticsData> => {
            if (!user?.id) throw new Error("No user");

            // Fetch tournaments with participants count
            const { data: tournaments, error } = await supabase
                .from('tournaments')
                .select(`
          id,
          created_at,
          status,
          start_date,
          prize_pool,
          game,
          participants:tournament_participants(count)
        `)
                .eq('organizer_id', user.id);

            if (error) throw error;

            // Fetch all participants for time-series data
            const tournamentIds = tournaments?.map(t => t.id) || [];
            let allParticipants: any[] = [];

            if (tournamentIds.length > 0) {
                const { data: participantsData } = await supabase
                    .from('tournament_participants')
                    .select('created_at')
                    .in('tournament_id', tournamentIds);
                allParticipants = participantsData || [];
            }

            // Process Data
            const totalTournaments = tournaments?.length || 0;

            // Calculate active and upcoming based on DB status and dates
            const now = new Date();
            let activeCount = 0;
            let upcomingCount = 0;

            tournaments?.forEach(t => {
                const startDate = new Date(t.start_date);

                // Status priority: DB status first
                if (['ongoing', 'check_in'].includes(t.status)) {
                    activeCount++;
                } else if (t.status === 'upcoming') {
                    upcomingCount++;
                } else if (t.status === 'open') {
                    // Open usually means upcoming/registering
                    upcomingCount++;
                } else {
                    // Fallback to date if status is ambiguous or 'published'
                    if (startDate > now) {
                        upcomingCount++;
                    } else if (startDate.toDateString() === now.toDateString()) {
                        activeCount++;
                    }
                }
            });

            // Calculate total prize pool
            const totalPrizePool = tournaments?.reduce((sum, t) => sum + (Number(t.prize_pool) || 0), 0) || 0;

            // Calculate total participants
            // Sum of counts from subquery (more efficient if available, but here we used head?)
            // Actually the select was participants:tournament_participants(count) which returns [{count: n}]
            // But supabase JS returns it as object or array depending on relation type.
            // Usually { count: ... } if it's head/count.
            // Let's rely on allParticipants.length for accuracy as we fetched them all.
            const totalParticipants = allParticipants.length;

            // Monthly Participation
            const months: Record<string, number> = {};
            allParticipants.forEach(p => {
                const date = new Date(p.created_at);
                const key = date.toLocaleString('default', { month: 'short' });
                months[key] = (months[key] || 0) + 1;
            });

            const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthlyParticipation = Object.entries(months)
                .sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]))
                .map(([name, participants]) => ({ name, participants }));

            // Game Distribution
            const games: Record<string, number> = {};
            tournaments?.forEach(t => {
                const gameName = t.game || 'Unknown';
                games[gameName] = (games[gameName] || 0) + 1;
            });
            const gameDistribution = Object.entries(games).map(([name, value]) => ({ name, value }));

            return {
                totalTournaments,
                totalParticipants,
                activeTournaments: activeCount,
                upcomingTournaments: upcomingCount,
                totalPrizePool,
                monthlyParticipation,
                gameDistribution
            };
        },
        enabled: !!user?.id
    });
};
