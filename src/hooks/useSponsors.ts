import { useQuery } from '@tanstack/react-query';
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
        queryKey: ['sponsor-stats', sponsorId],
        queryFn: async () => {
            return await apiClient.get<{
                impressions: number;
                clicks: number;
                ctr: string;
            }>(`/api/sponsors/${sponsorId}/stats`);
        },
        enabled: !!sponsorId,
        staleTime: 60 * 1000,
    });
}

// ─── TRACKING VIA .NET BACKEND ───────────────────────────────────────
// Uses fetch with keepalive:true — survives page navigation like sendBeacon
// but properly sets Content-Type: application/json (sendBeacon downgrades to text/plain).

const TRACK_URL = `${import.meta.env.VITE_API_URL}/api/sponsors/track`;

function invokeTrack(sponsorId: string, eventType: 'impression' | 'click', tournamentId?: string) {
    fetch(TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sponsorId,
            eventType,
            pageUrl: window.location.href,
            ...(tournamentId ? { tournamentId } : {}),
        }),
        keepalive: true,
    })
    .then(r => {
        if (!r.ok) console.error(`[Tracking] ${eventType} failed: HTTP ${r.status}`);
    })
    .catch(err => console.error(`[Tracking] ${eventType} network error:`, err));
}

// ─── PUBLIC API (drop-in replacement) ────────────────────────────────
export function trackImpression(sponsorId: string, tournamentId?: string) {
    invokeTrack(sponsorId, 'impression', tournamentId);
}

export function trackClick(sponsorId: string, tournamentId?: string) {
    invokeTrack(sponsorId, 'click', tournamentId);
}

