import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Sponsor = Database['public']['Tables']['sponsors']['Row'];

export interface PartnerData {
    sponsor: Sponsor;
    account: { sponsor_id: string; role: string };
    stats: {
        impressions: number;
        uniqueImpressions: number;
        clicks: number;
        ctr: number;
    };
    history: { date: string; impressions: number; uniqueImpressions: number; clicks: number }[];
}

export const usePartnerData = () => {
    return useQuery<PartnerData>({
        queryKey: ['partner', 'profile'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Get linked sponsor account
            const { data: account, error: accountError } = await supabase
                .from('sponsor_accounts')
                .select('sponsor_id, role')
                .eq('user_id', user.id)
                .returns<{ sponsor_id: string; role: string }[]>()
                .single();

            if (accountError || !account) throw new Error('No sponsor account linked');

            // Get sponsor details
            const { data: sponsor, error: sponsorError } = await supabase
                .from('sponsors')
                .select('*')
                .eq('id', account.sponsor_id)
                .single();

            if (sponsorError) throw sponsorError;

            // Get real-time totals from raw impressions (always accurate)
            const [
                { count: impressions },
                { count: clicks },
            ] = await Promise.all([
                supabase
                    .from('sponsor_impressions')
                    .select('*', { count: 'exact', head: true })
                    .eq('sponsor_id', account.sponsor_id)
                    .eq('event_type', 'impression')
                    .returns<any[]>(),
                supabase
                    .from('sponsor_impressions')
                    .select('*', { count: 'exact', head: true })
                    .eq('sponsor_id', account.sponsor_id)
                    .eq('event_type', 'click')
                    .returns<any[]>(),
            ]);

            // Get history from the optimized summary table (for chart)
            const { data: dailyStats } = await supabase
                .from('daily_sponsor_stats')
                .select('stat_date, impressions, clicks, unique_impressions')
                .eq('sponsor_id', account.sponsor_id)
                .order('stat_date', { ascending: false })
                .limit(90)
                .returns<{ stat_date: string; impressions: number; clicks: number; unique_impressions: number }[]>();

            // Map stat_date → date for chart compatibility
            const history = (dailyStats || []).map(r => ({
                date: r.stat_date,
                impressions: Number(r.impressions || 0),
                uniqueImpressions: Number(r.unique_impressions || 0),
                clicks: Number(r.clicks || 0),
            }));

            // Total unique impressions across all days
            const totalUniqueImpressions = history.reduce((sum, r) => sum + r.uniqueImpressions, 0);

            return {
                sponsor: sponsor as Sponsor,
                account,
                stats: {
                    impressions: impressions ?? 0,
                    uniqueImpressions: totalUniqueImpressions,
                    clicks: clicks ?? 0,
                    ctr: (impressions ?? 0) > 0 ? ((clicks ?? 0) / impressions!) * 100 : 0
                },
                history: history.reverse() // Order chronologically for the chart
            };
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export interface DemographicBreakdown {
    countries: { name: string; count: number }[];
    ageGroups: { group: string; count: number }[];
}

export const useDemographics = (sponsorId: string) => {
    return useQuery<DemographicBreakdown>({
        queryKey: ['partner', 'demographics', sponsorId],
        enabled: !!sponsorId,
        queryFn: async () => {
            // Aggregate country from metadata JSONB
            const { data: countryData } = await supabase
                .from('sponsor_impressions')
                .select('metadata')
                .eq('sponsor_id', sponsorId)
                .eq('event_type', 'impression');

            const countryMap: Record<string, number> = {};
            const ageMap: Record<string, number> = {};

            (countryData || []).forEach((row: any) => {
                const meta = row.metadata || {};
                const country = meta.country || 'Unknown';
                const ageGroup = meta.age_group || 'unknown';
                countryMap[country] = (countryMap[country] || 0) + 1;
                ageMap[ageGroup] = (ageMap[ageGroup] || 0) + 1;
            });

            const countries = Object.entries(countryMap)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 8);

            const ageGroups = Object.entries(ageMap)
                .map(([group, count]) => ({ group, count }))
                .sort((a, b) => b.count - a.count);

            return { countries, ageGroups };
        },
        staleTime: 1000 * 60 * 5,
    });
};
