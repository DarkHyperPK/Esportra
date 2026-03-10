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
 * Provides `linkFaceitAccount()` to start the OAuth flow and
 * `unlinkFaceitAccount()` to remove the link.
 */
export function useFaceitAccount() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: faceitAccount, isLoading, refetch } = useQuery<FaceitAccountData | null>({
        queryKey: ['faceit-account', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            try {
                return await apiClient.get(`/api/integrations/faceit`);
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
     * Redirect user to Faceit OAuth to link their account.
     * Uses PKCE (S256).
     */
    const linkFaceitAccount = async () => {
        if (!user?.id) return;

        const clientId = import.meta.env.VITE_FACEIT_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_FACEIT_REDIRECT_URI
            || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/faceit-oauth`;

        if (!clientId) {
            console.error('[useFaceitAccount] Missing VITE_FACEIT_CLIENT_ID.');
            return;
        }

        const verifierBytes = new Uint8Array(32);
        crypto.getRandomValues(verifierBytes);
        const codeVerifier = btoa(String.fromCharCode(...verifierBytes))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
        const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        const state = crypto.randomUUID();
        localStorage.setItem('faceitOAuthState', state);
        localStorage.setItem('faceitCodeVerifier', codeVerifier);

        const faceitAuthUrl =
            `https://accounts.faceit.com/?client_id=${clientId}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=code` +
            `&state=${state}` +
            `&code_challenge=${codeChallenge}` +
            `&code_challenge_method=S256`;

        window.open(faceitAuthUrl, '_blank');
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
