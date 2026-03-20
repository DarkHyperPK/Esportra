import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface BrandingData {
    logoUrl: string;
    iconUrl: string;
}

export const useBranding = () => {
    return useQuery<BrandingData>({
        queryKey: ['branding'],
        queryFn: () => apiClient.get<BrandingData>('/api/system/branding'),
        staleTime: 1000 * 60 * 60,
        gcTime: 1000 * 60 * 60 * 24,
    });
};
