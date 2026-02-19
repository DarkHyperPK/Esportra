import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface BrandingData {
    logoUrl: string;
    iconUrl: string;
}

export const useBranding = () => {
    return useQuery<BrandingData>({
        queryKey: ['branding'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('system_settings')
                .select('key, value')
                .in('key', ['platform_logo_url', 'platform_icon_url']);

            if (error) throw error;

            const settings = (data || []).reduce((acc: Record<string, string>, item: { key: string; value: string }) => {
                acc[item.key] = item.value;
                return acc;
            }, {} as Record<string, string>);

            return {
                logoUrl: settings['platform_logo_url'] || '/logo.svg',
                iconUrl: settings['platform_icon_url'] || '/logo.svg',
            };
        },
        staleTime: 1000 * 60 * 60, // 1 hour
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
    });
};
