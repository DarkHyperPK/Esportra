import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface PartnerApplication {
    company_name: string;
    company_website: string;
    company_size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
    industry: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
    contact_title?: string;
    partnership_tier: 'radiant' | 'ascendant' | 'diamond' | 'standard';
    partnership_goals: string[];
    budget_range?: 'under_1k' | '1k_5k' | '5k_15k' | '15k_50k' | '50k_plus' | 'undecided';
    message?: string;
    how_heard?: string;
}

export const usePartnerApplication = () => {
    const { toast } = useToast();

    const submitApplication = useMutation({
        mutationFn: async (application: PartnerApplication) => {
            const { data, error } = await supabase
                .from('partner_applications')
                .insert(application);

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast({
                title: 'Application Submitted!',
                description: 'Thank you for your interest. Our partnerships team will review your application and get back to you within 3-5 business days.',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Submission Failed',
                description: error.message || 'Something went wrong. Please try again.',
                variant: 'destructive',
            });
        },
    });

    return { submitApplication };
};
