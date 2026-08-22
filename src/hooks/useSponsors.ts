import { useQuery } from '@tanstack/react-query';
import { trackSponsorEvent } from '@/features/sponsorTracking/trackSponsorEvent';
import { apiClient } from '@/lib/apiClient';

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
            const params = new URLSearchParams();
            if (placement) params.set('placement', placement);
            const qs = params.toString();
            let sponsors = await apiClient.get<Sponsor[]>(`/api/sponsors/active${qs ? `?${qs}` : ''}`);

            // Filter by date range client-side
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
            return await apiClient.get<Sponsor[]>('/api/sponsors');
        },
    });
}

export function useSponsorStats(sponsorId: string) {
    return useQuery({
        queryKey: ['admin', 'sponsor-stats', sponsorId],
        queryFn: async () => {
            try {
                const res = await apiClient.get<{
                    impressions: number;
                    clicks: number;
                    ctr: number;
                }>(`/api/admin/sponsors/${sponsorId}/analytics/summary?days=30`);
                return { impressions: res.impressions, clicks: res.clicks, ctr: `${res.ctr.toFixed(1)}%` };
            } catch (err: unknown) {
                if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 403)
                    return { impressions: 0, clicks: 0, ctr: '0%' };
                throw err;
            }
        },
        enabled: !!sponsorId,
        staleTime: 60 * 1000,
    });
}

// ─── TRACKING VIA .NET BACKEND ───────────────────────────────────────
// Uses fetch with keepalive:true — survives page navigation like sendBeacon
// but properly sets Content-Type: application/json (sendBeacon downgrades to text/plain).

type TrackingPlacement = Parameters<typeof trackSponsorEvent>[2];

function invokeTrack(sponsorId: string, eventType: 'impression' | 'click', placement: TrackingPlacement, tournamentId?: string) {
    void trackSponsorEvent(sponsorId, eventType, placement, tournamentId);
}

// ─── PUBLIC API ──────────────────────────────────────────────────────
export function trackImpression(sponsorId: string, placement: TrackingPlacement = 'partner_showcase', tournamentId?: string) {
    invokeTrack(sponsorId, 'impression', placement, tournamentId);
}

export function trackClick(sponsorId: string, placement: TrackingPlacement = 'partner_showcase', tournamentId?: string) {
    invokeTrack(sponsorId, 'click', placement, tournamentId);
}

