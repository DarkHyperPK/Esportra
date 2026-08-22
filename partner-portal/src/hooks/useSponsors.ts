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
    tier: 'radiant' | 'ascendant' | 'partner' | 'diamond' | 'standard';
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


