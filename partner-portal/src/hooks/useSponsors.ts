import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Sponsor {
    id: string;
    name: string;
    tagline: string | null;
    description: string | null;
    website_url: string;
    logo_url: string | null;
    banner_image_url: string | null;
    accent_color: string;
    tier: 'radiant' | 'ascendant' | 'diamond' | 'standard' | 'platinum' | 'gold';
    placement: string[];
    cta_text: string;
    discount_text: string | null;
    is_active: boolean;
    priority: number;
    gallery_images?: string[];
    start_date: string | null;
    end_date: string | null;
    created_at: string;
}

export function useSponsors(placement?: string) {
    return useQuery({
        queryKey: ['sponsors', placement],
        queryFn: async () => {
            let query = supabase
                .from('sponsors')
                .select('*')
                .eq('is_active', true)
                .order('priority', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;

            let sponsors = (data || []) as Sponsor[];

            if (placement) {
                sponsors = sponsors.filter(s => s.placement?.includes(placement));
            }

            const now = new Date().toISOString();
            sponsors = sponsors.filter(s => {
                if (s.start_date && s.start_date > now) return false;
                if (s.end_date && s.end_date < now) return false;
                return true;
            });

            return sponsors;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useAllSponsors() {
    return useQuery({
        queryKey: ['sponsors', 'all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sponsors')
                .select('*')
                .order('priority', { ascending: false });
            if (error) throw error;
            return (data || []) as Sponsor[];
        },
    });
}

// ─── OPTIMIZED STATS: Reads from pre-aggregated daily_sponsor_stats ───
export function useSponsorStats(sponsorId: string) {
    return useQuery({
        queryKey: ['sponsor-stats', sponsorId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('daily_sponsor_stats')
                .select('impressions, clicks')
                .eq('sponsor_id', sponsorId);

            if (error) {
                // Fallback: read raw table if summary doesn't exist yet
                console.warn('Falling back to raw impression count:', error.message);
                const [impressions, clicks] = await Promise.all([
                    supabase
                        .from('sponsor_impressions')
                        .select('*', { count: 'exact', head: true })
                        .eq('sponsor_id', sponsorId)
                        .eq('event_type', 'impression'),
                    supabase
                        .from('sponsor_impressions')
                        .select('*', { count: 'exact', head: true })
                        .eq('sponsor_id', sponsorId)
                        .eq('event_type', 'click'),
                ]);
                return {
                    impressions: impressions.count || 0,
                    clicks: clicks.count || 0,
                    ctr: impressions.count ? ((clicks.count || 0) / impressions.count * 100).toFixed(1) : '0.0',
                };
            }

            const totals = (data || []).reduce(
                (acc: { impressions: number; clicks: number }, row: any) => ({
                    impressions: acc.impressions + (row.impressions || 0),
                    clicks: acc.clicks + (row.clicks || 0),
                }),
                { impressions: 0, clicks: 0 }
            );

            return {
                impressions: totals.impressions,
                clicks: totals.clicks,
                ctr: totals.impressions
                    ? ((totals.clicks / totals.impressions) * 100).toFixed(1)
                    : '0.0',
            };
        },
        staleTime: 60 * 1000,
    });
}

// Fire-and-forget tracking (partner portal doesn't need micro-batching)
export async function trackImpression(sponsorId: string) {
    await supabase.from('sponsor_impressions').insert({
        sponsor_id: sponsorId,
        event_type: 'impression',
    } as any);
}

export async function trackClick(sponsorId: string) {
    await supabase.from('sponsor_impressions').insert({
        sponsor_id: sponsorId,
        event_type: 'click',
    } as any);
}
