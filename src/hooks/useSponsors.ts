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
    tier: 'radiant' | 'ascendant' | 'diamond' | 'standard';
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

            // Filter by placement if specified
            if (placement) {
                sponsors = sponsors.filter(s => s.placement?.includes(placement));
            }

            // Filter by date range
            const now = new Date().toISOString();
            sponsors = sponsors.filter(s => {
                if (s.start_date && s.start_date > now) return false;
                if (s.end_date && s.end_date < now) return false;
                return true;
            });

            return sponsors;
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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
            // Read from the pre-aggregated summary table (O(1) instead of O(n))
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

            // Sum across all days
            const totals = (data || []).reduce(
                (acc, row) => ({
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
        staleTime: 60 * 1000, // 1 minute cache (summary data is already aggregated)
    });
}

// ─── TRACKING VIA EDGE FUNCTION ──────────────────────────────────────
// All tracking now goes through the `record-metric` Edge Function.
// This is more secure (no public DB inserts), more reliable (bypasses
// ad-blockers), and enables server-side GeoIP + age-group resolution.

async function invokeTrack(sponsorId: string, eventType: 'impression' | 'click') {
    console.log(`[Tracking] invoking record-metric for ${sponsorId} (${eventType})`);
    try {
        const { data, error } = await supabase.functions.invoke('record-metric', {
            body: {
                sponsor_id: sponsorId,
                event_type: eventType,
                page_url: typeof window !== 'undefined' ? window.location.href : null,
            },
        });

        if (error) {
            // Extract the actual response body from FunctionsHttpError
            let errorBody = null;
            try {
                if (error.context && typeof error.context.json === 'function') {
                    errorBody = await error.context.json();
                }
            } catch (_) { /* ignore parse errors */ }
            console.error('[Tracking] Edge function error:', error.message, 'Body:', errorBody);
        } else {
            console.log('[Tracking] Success:', data);
        }
    } catch (err) {
        console.error('[Tracking] Edge function call failed (exception):', err);
    }
}

// ─── PUBLIC API (drop-in replacement) ────────────────────────────────
export function trackImpression(sponsorId: string) {
    invokeTrack(sponsorId, 'impression');
}

export function trackClick(sponsorId: string) {
    invokeTrack(sponsorId, 'click');
}

