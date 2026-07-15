import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { fetchCurrentOrganizationId } from '@/lib/currentOrganization';
import { hasTournamentStartTimePassed } from '@/utils/tournamentStatusUtils';

export interface AnalyticsData {
    totalTournaments: number;
    totalParticipants: number;
    activeTournaments: number;
    upcomingTournaments: number;
    totalPrizePool: number;
    monthlyParticipation: { name: string; participants: number }[];
    gameDistribution: { name: string; value: number }[];
}

const EMPTY_ANALYTICS: AnalyticsData = {
    totalTournaments: 0,
    totalParticipants: 0,
    activeTournaments: 0,
    upcomingTournaments: 0,
    totalPrizePool: 0,
    monthlyParticipation: [],
    gameDistribution: [],
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function normalizeRows(value: unknown): any[] {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
        const record = value as { data?: unknown; items?: unknown };
        if (Array.isArray(record.data)) return record.data;
        if (Array.isArray(record.items)) return record.items;
    }
    return [];
}

function inferTournamentBuckets(tournaments: any[], now = new Date()) {
    let active = 0;
    let upcoming = 0;

    for (const tournament of tournaments) {
        const status = tournament.status as string;
        const started = hasTournamentStartTimePassed(tournament.start_date, now);

        if (status === 'ongoing' || ['open', 'check_in'].includes(status)) {
            active += 1;
        } else if (['draft', 'published', 'open', 'closed', 'check_in'].includes(status) && !started) {
            upcoming += 1;
        }
    }

    return { active, upcoming };
}

function buildGameDistribution(tournaments: any[]) {
    const counts = new Map<string, number>();

    for (const tournament of tournaments) {
        const game = (tournament.game as string | undefined)?.trim();
        if (!game) continue;
        counts.set(game, (counts.get(game) ?? 0) + 1);
    }

    return Array.from(counts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
}

function buildMonthlyParticipation(participants: any[]) {
    const now = new Date();
    const monthBuckets = new Map<string, number>();

    for (let offset = 5; offset >= 0; offset -= 1) {
        const bucketDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const key = `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, '0')}`;
        monthBuckets.set(key, 0);
    }

    for (const participant of participants) {
        const registeredAt = participant.registered_at ?? participant.created_at;
        if (!registeredAt) continue;

        const date = new Date(registeredAt);
        if (Number.isNaN(date.getTime())) continue;

        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthBuckets.has(key)) continue;
        monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1);
    }

    return Array.from(monthBuckets.entries()).map(([month, participantsCount]) => ({
        name: MONTH_NAMES[parseInt(month.split('-')[1], 10) - 1] || month,
        participants: participantsCount,
    }));
}

export const useOrganizerStats = () => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['organizer-analytics', user?.id],
        queryFn: async (): Promise<AnalyticsData> => {
            const organizationId = await fetchCurrentOrganizationId();
            if (!organizationId) return EMPTY_ANALYTICS;

            const [rawTournaments, rawParticipants] = await Promise.all([
                apiClient.get<unknown>(`/api/organizations/${organizationId}/tournaments`).catch(() => []),
                apiClient.get<{ items?: unknown[]; total?: number }>(
                    `/api/organizations/${organizationId}/participants?limit=500`,
                ).catch(() => ({ items: [], total: 0 })),
            ]);

            const tournaments = normalizeRows(rawTournaments);
            const participants = normalizeRows(rawParticipants);
            const totalParticipants = typeof rawParticipants === 'object'
                && rawParticipants !== null
                && !Array.isArray(rawParticipants)
                && typeof (rawParticipants as { total?: number }).total === 'number'
                ? (rawParticipants as { total: number }).total
                : participants.length;

            const { active, upcoming } = inferTournamentBuckets(tournaments);
            const totalPrizePool = tournaments.reduce((sum, tournament) => {
                const prizePool = Number(tournament.prize_pool ?? 0);
                return sum + (Number.isFinite(prizePool) ? prizePool : 0);
            }, 0);

            return {
                totalTournaments: tournaments.length,
                totalParticipants,
                activeTournaments: active,
                upcomingTournaments: upcoming,
                totalPrizePool,
                monthlyParticipation: buildMonthlyParticipation(participants),
                gameDistribution: buildGameDistribution(tournaments),
            };
        },
        enabled: !!user?.id,
        staleTime: 60_000,
    });
};
