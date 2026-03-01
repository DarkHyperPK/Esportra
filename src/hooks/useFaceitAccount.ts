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

    /**
     * Redirect user to Faceit OAuth to link their account.
     * A CSRF state token is stored in sessionStorage and verified
     * when the edge function redirects back to /player/profile.
     */
    const linkFaceitAccount = () => {
        if (!user?.id) return;

        const clientId = import.meta.env.VITE_FACEIT_CLIENT_ID;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        if (!clientId || !supabaseUrl) {
            console.error('[useFaceitAccount] Missing VITE_FACEIT_CLIENT_ID or VITE_SUPABASE_URL.');
            return;
        }

        const state = crypto.randomUUID();
        sessionStorage.setItem('faceitOAuthState', state);

        const redirectUri = `${supabaseUrl}/functions/v1/faceit-oauth`;
        const faceitAuthUrl =
            `https://accounts.faceit.com/?client_id=${clientId}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=code` +
            `&state=${state}`;

        window.location.href = faceitAuthUrl;
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
