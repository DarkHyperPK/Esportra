import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
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
            return apiClient.post('/api/partners/apply', {
                companyName: application.company_name,
                companyWebsite: application.company_website,
                companySize: application.company_size,
                industry: application.industry,
                contactName: application.contact_name,
                contactEmail: application.contact_email,
                contactPhone: application.contact_phone,
                contactTitle: application.contact_title,
                partnershipTier: application.partnership_tier,
                partnershipGoals: application.partnership_goals,
                budgetRange: application.budget_range,
                message: application.message,
                howHeard: application.how_heard,
            });
        },
        onSuccess: () => {
            toast({
                title: 'Application Submitted!',
                description: 'Thank you for your interest. Our partnerships team will review your application and get back to you within 3-5 business days.',
            });
        },
        onError: (error: Error & { status?: number; body?: { error?: string } }) => {
            const isDuplicate = error.status === 409;
            toast({
                title: isDuplicate ? 'Application Already Exists' : 'Submission Failed',
                description: isDuplicate
                    ? 'An application with this email has already been submitted. Our team will be in touch.'
                    : error.body?.error || error.message || 'Something went wrong. Please try again.',
                variant: isDuplicate ? 'default' : 'destructive',
            });
        },
    });

    return { submitApplication };
};
