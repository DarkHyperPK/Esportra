import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';

export interface OnboardingMeta {
    completed: boolean;
    current_step: number;
    completed_at: string | null;
    steps: {
        identity?: {
            company_name: string;
            tagline: string;
            contact_confirmed: boolean;
        };
        branding?: {
            logo_url: string | null;
        };
        legal?: {
            agreed_at: string;
            ip: string;
        };
    };
}

const DEFAULT_META: OnboardingMeta = {
    completed: false,
    current_step: 0,
    completed_at: null,
    steps: {},
};

export const useOnboarding = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Query: Fetch onboarding_meta from sponsor_accounts
    const query = useQuery({
        queryKey: ['onboarding'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await (supabase as any)
                .from('sponsor_accounts')
                .select('sponsor_id, onboarding_meta')
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            if (!data) throw new Error('No sponsor account found');

            return {
                sponsorId: data.sponsor_id as string,
                meta: (data.onboarding_meta as OnboardingMeta) || DEFAULT_META,
            };
        },
        staleTime: 1000 * 60 * 2,
    });

    // Mutation: Save a step's data
    const saveStep = useMutation({
        mutationFn: async ({ stepName, stepData, nextStep }: {
            stepName: string;
            stepData: Record<string, any>;
            nextStep: number;
        }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const currentMeta = query.data?.meta || DEFAULT_META;
            const updatedMeta: OnboardingMeta = {
                ...currentMeta,
                current_step: nextStep,
                steps: {
                    ...currentMeta.steps,
                    [stepName]: stepData,
                },
            };

            const { data, error } = await (supabase as any)
                .from('sponsor_accounts')
                .update({ onboarding_meta: updatedMeta })
                .eq('user_id', user.id)
                .select()
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            if (!data) throw new Error('Update failed due to Row Level Security missing UPDATE policy.');
            return updatedMeta;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboarding'] });
        },
        onError: (err: any) => {
            toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
        },
    });

    // Mutation: Complete onboarding
    const completeOnboarding = useMutation({
        mutationFn: async (legalData: { agreed_at: string; ip: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const currentMeta = query.data?.meta || DEFAULT_META;
            const updatedMeta: OnboardingMeta = {
                ...currentMeta,
                completed: true,
                current_step: 3,
                completed_at: new Date().toISOString(),
                steps: {
                    ...currentMeta.steps,
                    legal: legalData,
                },
            };

            const { data, error } = await (supabase as any)
                .from('sponsor_accounts')
                .update({ onboarding_meta: updatedMeta })
                .eq('user_id', user.id)
                .select()
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            if (!data) throw new Error('Activation failed due to Row Level Security missing UPDATE policy.');
            return updatedMeta;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboarding'] });
            queryClient.invalidateQueries({ queryKey: ['partner', 'profile'] });
            toast({ title: 'Welcome Aboard!', description: 'Your account setup is complete.' });
        },
        onError: (err: any) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
    });

    return {
        sponsorId: query.data?.sponsorId,
        meta: query.data?.meta || DEFAULT_META,
        isLoading: query.isLoading,
        isCompleted: query.data?.meta?.completed ?? false,
        currentStep: query.data?.meta?.current_step ?? 0,
        saveStep,
        completeOnboarding,
    };
};
