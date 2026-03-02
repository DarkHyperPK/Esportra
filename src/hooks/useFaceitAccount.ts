import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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
            const { data, error } = await supabase
                .from('faceit_accounts')
                .select('id, user_id, faceit_id, nickname, avatar_url, linked_at, updated_at')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('[useFaceitAccount] Error fetching faceit account:', error);
                return null;
            }
            return data;
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
     * Uses PKCE (S256) — code_verifier stored in sessionStorage and sent
     * to the edge function for the server-side token exchange.
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

        // Generate PKCE code verifier (random 32-byte base64url string)
        const verifierBytes = new Uint8Array(32);
        crypto.getRandomValues(verifierBytes);
        const codeVerifier = btoa(String.fromCharCode(...verifierBytes))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        // Derive code challenge: base64url(SHA-256(verifier))
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
        const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        const state = crypto.randomUUID();
        // Use localStorage so the verifier/state survive across tabs
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
     * Remove the linked Faceit account and clear the cached nickname from profiles.
     */
    const unlinkFaceitAccount = async () => {
        if (!user?.id) return;

        const { error: unlinkError } = await supabase
            .from('faceit_accounts')
            .delete()
            .eq('user_id', user.id);

        if (unlinkError) {
            console.error('[useFaceitAccount] Error unlinking faceit account:', unlinkError);
            throw unlinkError;
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update({ faceit_nickname: null })
            .eq('id', user.id);

        if (profileError) {
            console.error('[useFaceitAccount] Error clearing faceit_nickname from profile:', profileError);
            throw profileError;
        }

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
