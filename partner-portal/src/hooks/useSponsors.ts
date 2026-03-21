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

interface SponsorStats {
    impressions: number;
    clicks: number;
    ctr: string;
}

export function useSponsors(placement?: string) {
    return useQuery<Sponsor[]>({
        queryKey: ['sponsors', placement],
        queryFn: () => {
            const params = placement ? `?placement=${encodeURIComponent(placement)}` : '';
            return apiClient.get<Sponsor[]>(`/api/sponsors/active${params}`);
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useAllSponsors() {
    return useQuery<Sponsor[]>({
        queryKey: ['sponsors', 'all'],
        queryFn: () => apiClient.get<Sponsor[]>('/api/sponsors/all'),
    });
}

export function useSponsorStats(sponsorId: string) {
    return useQuery<SponsorStats>({
        queryKey: ['sponsor-stats', sponsorId],
        queryFn: () => apiClient.get<SponsorStats>(`/api/sponsors/${sponsorId}/stats`),
        enabled: !!sponsorId,
        staleTime: 60 * 1000,
    });
}

export async function trackImpression(sponsorId: string) {
    await apiClient.post('/api/sponsors/track', { sponsorId, eventType: 'impression' });
}

export async function trackClick(sponsorId: string) {
    await apiClient.post('/api/sponsors/impressions', { sponsorId, eventType: 'click' });
}
