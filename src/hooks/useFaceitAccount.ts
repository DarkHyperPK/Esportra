import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

export interface FaceitAccountData {
    id: string;
    user_id: string;
    faceit_id: string;
    nickname: string;
    avatar_url: string | null;
    linked_at: string | null;
    updated_at: string | null;
}

/**
 * Fetches the current user's linked Faceit account.
 * Uses BFF pattern — OAuth + PKCE are entirely server-side.
 */
export function useFaceitAccount() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: faceitAccount, isLoading, refetch } = useQuery<FaceitAccountData | null>({
        queryKey: ['faceit-account', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            try {
                const data = await apiClient.get<any>(`/api/integrations/faceit`);
                return data?.linked ? data : null;
            } catch {
                return null;
            }
        },
        enabled: !!user?.id,
    });

    // When another tab completes Faceit linking, refresh this tab's cache
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'faceit_just_linked') {
                queryClient.invalidateQueries({ queryKey: ['faceit-account'] });
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [queryClient]);

    /**
     * Start Faceit OAuth via BFF — backend generates PKCE + encrypted state.
     * No secrets, verifiers, or codes touch the frontend.
     */
    const linkFaceitAccount = async () => {
        if (!user?.id) return;
        try {
            const data = await apiClient.get<{ url: string }>('/api/integrations/faceit/start');
            if (data?.url) {
                window.open(data.url, '_blank');
            }
        } catch (err) {
            console.error('[useFaceitAccount] Failed to start OAuth:', err);
        }
    };

    /**
     * Remove the linked Faceit account.
     */
    const unlinkFaceitAccount = async () => {
        if (!user?.id) return;
        await apiClient.delete('/api/integrations/faceit');
        queryClient.invalidateQueries({ queryKey: ['faceit-account', user.id] });
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    };

    return {
        faceitAccount: faceitAccount ?? null,
        isLoading,
        linkFaceitAccount,
        unlinkFaceitAccount,
        refetch,
    };
}
