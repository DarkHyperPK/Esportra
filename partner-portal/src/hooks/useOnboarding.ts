import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from './use-toast';
import type { OnboardingMeta } from './usePartnerData';

const DEFAULT_META: OnboardingMeta = {
    completed: false,
    current_step: 0,
    completed_at: null,
    steps: {},
};

export type { OnboardingMeta };

export const useOnboarding = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const query = useQuery({
        queryKey: ['onboarding'],
        queryFn: async () => {
            const data = await apiClient.get<{ sponsorId: string; meta: OnboardingMeta }>('/api/sponsors/me/onboarding');
            return data;
        },
        staleTime: 1000 * 60 * 2,
    });

    const saveStep = useMutation({
        mutationFn: async ({ stepName, stepData, nextStep }: {
            stepName: string;
            stepData: Record<string, unknown>;
            nextStep: number;
        }) => {
            const result = await apiClient.put<{ success: boolean; meta: OnboardingMeta }>(
                '/api/sponsors/me/onboarding/step',
                { stepName, stepData, nextStep }
            );
            return result.meta;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboarding'] });
        },
        onError: (err: Error) => {
            toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
        },
    });

    const completeOnboarding = useMutation({
        mutationFn: async (legalData: { agreed_at: string; ip: string }) => {
            await apiClient.post('/api/sponsors/me/onboarding/complete', {
                agreedAt: legalData.agreed_at,
                ip: legalData.ip,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboarding'] });
            queryClient.invalidateQueries({ queryKey: ['partner', 'profile'] });
            toast({ title: 'Welcome Aboard!', description: 'Your account setup is complete.' });
        },
        onError: (err: Error) => {
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
