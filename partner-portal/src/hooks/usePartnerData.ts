import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface PartnerData {
    sponsor: {
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
        gallery_images: string[];
        detail_deck_url: string | null;
        created_at: string;
    };
    account: { sponsor_id: string; role: string; onboarding_meta?: OnboardingMeta };
    stats: {
        impressions: number;
        uniqueImpressions: number;
        clicks: number;
        ctr: number;
    };
    history: { date: string; impressions: number; uniqueImpressions: number; clicks: number }[];
}

export interface OnboardingMeta {
    completed: boolean;
    current_step: number;
    completed_at: string | null;
    steps: {
        identity?: { company_name: string; tagline: string; contact_confirmed: boolean };
        branding?: { logo_url: string | null };
        legal?: { agreed_at: string; ip: string };
    };
}

export interface DemographicBreakdown {
    countries: { name: string; count: number }[];
    ageGroups: { group: string; count: number }[];
}

export const usePartnerData = () => {
    return useQuery<PartnerData>({
        queryKey: ['partner', 'profile'],
        queryFn: () => apiClient.get<PartnerData>('/api/sponsors/me'),
        staleTime: 1000 * 60 * 5,
    });
};

export const useDemographics = (sponsorId: string) => {
    return useQuery<DemographicBreakdown>({
        queryKey: ['partner', 'demographics', sponsorId],
        enabled: !!sponsorId,
        queryFn: () => apiClient.get<DemographicBreakdown>('/api/sponsors/me/demographics'),
        staleTime: 1000 * 60 * 5,
    });
};
