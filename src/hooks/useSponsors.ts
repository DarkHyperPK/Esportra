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
            const params = new URLSearchParams({ active: 'true' });
            if (placement) params.set('placement', placement);
            let sponsors = await apiClient.get<Sponsor[]>(`/api/sponsors?${params}`);

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
// Uses sendBeacon for clicks (survives navigation) and fetch for impressions.

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5200';

function invokeTrack(sponsorId: string, eventType: 'impression' | 'click') {
    const payload = JSON.stringify({
        sponsorId,
        eventType,
        pageUrl: typeof window !== 'undefined' ? window.location.href : null,
    });

    // sendBeacon is fire-and-forget — guaranteed to complete even during navigation
    if (eventType === 'click' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(`${API_BASE}/api/sponsors/track`, blob);
        return;
    }

    // Impressions use regular fetch (page isn't navigating away)
    apiClient.post('/api/sponsors/track', { sponsorId, eventType, pageUrl: window.location.href })
        .catch(err => console.warn('[Tracking] API call failed:', err));
}

// ─── PUBLIC API (drop-in replacement) ────────────────────────────────
export function trackImpression(sponsorId: string) {
    invokeTrack(sponsorId, 'impression');
}

export function trackClick(sponsorId: string) {
    invokeTrack(sponsorId, 'click');
}

