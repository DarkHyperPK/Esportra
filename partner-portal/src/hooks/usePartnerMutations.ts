import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from './use-toast';

interface SponsorUpdate {
    name?: string;
    tagline?: string;
    description?: string;
    website_url?: string;
    cta_text?: string;
    logo_url?: string;
    banner_image_url?: string;
    gallery_images?: string[];
}

export const usePartnerMutations = (_sponsorId: string) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const updateProfile = useMutation({
        mutationFn: async (updates: SponsorUpdate) => {
            return apiClient.put('/api/sponsors/me', updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partner', 'profile'] });
            toast({ title: 'Success', description: 'Campaign profile updated.' });
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    });

    return { updateProfile };
};
