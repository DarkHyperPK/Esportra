import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface RiotAccountData {
    id: string;
    user_id: string;
    puuid: string;
    game_name: string;
    tag_line: string;
    region: string | null;
    linked_at: string | null;
    updated_at: string | null;
}

/**
 * Fetches the current user's linked Riot account.
 * Provides `linkRiotAccount()` to start the OAuth flow and 
 * `unlinkRiotAccount()` to remove the link.
 */
export function useRiotAccount() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: riotAccount, isLoading, refetch } = useQuery<RiotAccountData | null>({
        queryKey: ['riot-account', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('riot_accounts')
                .select('id, user_id, puuid, game_name, tag_line, region, linked_at, updated_at')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('[useRiotAccount] Error fetching riot account:', error);
                return null;
            }
            return data;
        },
        enabled: !!user?.id,
    });

    /**
     * Redirect user to Riot OAuth to link their account.
     * The `state` parameter carries the Supabase user ID so the Edge Function
     * can associate the Riot account with the correct user.
     */
    const linkRiotAccount = () => {
        if (!user?.id) return;
        const clientId = '2c69ea8c-08ad-4e39-a558-dc7f8106a2a2';
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
            console.error('[useRiotAccount] Missing VITE_SUPABASE_URL. Riot OAuth will fail.');
            return;
        }
        const redirectUri = `${supabaseUrl}/functions/v1/riot-oauth`;
        const riotAuthUrl = `https://auth.riotgames.com/authorize?redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${clientId}&response_type=code&scope=openid&state=${user.id}&prompt=login`;
        window.location.href = riotAuthUrl;
    };

    /**
     * Remove the linked Riot account.
     */
    const unlinkRiotAccount = async () => {
        if (!user?.id) return;
        const { error } = await supabase
            .from('riot_accounts')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            console.error('[useRiotAccount] Error unlinking riot account:', error);
            throw error;
        }
        queryClient.invalidateQueries({ queryKey: ['riot-account', user.id] });
    };

    return {
        riotAccount: riotAccount ?? null,
        isLoading,
        linkRiotAccount,
        unlinkRiotAccount,
        refetch,
    };
}
