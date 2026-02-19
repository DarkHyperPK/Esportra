import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import type { Database } from '@/lib/database.types';

type SponsorUpdate = Database['public']['Tables']['sponsors']['Update'];

export const usePartnerMutations = (sponsorId: string) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const updateProfile = useMutation({
        mutationFn: async (updates: SponsorUpdate) => {
            // @ts-ignore - Workaround for stubborn type inference issue in this environment
            const { data, error } = await (supabase as any)
                .from('sponsors')
                .update(updates)
                .eq('id', sponsorId)
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partner', 'profile'] });
            toast({ title: 'Success', description: 'Campaign profile updated.' });
        },
        onError: (err: any) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    });

    return { updateProfile };
};
