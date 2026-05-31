import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

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
 * Uses BFF pattern — OAuth flow is entirely server-side.
 */
export function useRiotAccount() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: riotAccount, isLoading, refetch } = useQuery<RiotAccountData | null>({
        queryKey: ['riot-account', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            try {
                const data = await apiClient.get<any>(`/api/integrations/riot`);
                return data?.linked ? data : null;
            } catch {
                return null;
            }
        },
        enabled: !!user?.id,
    });

    /**
     * Start Riot OAuth via BFF — backend generates the authorize URL
     * with encrypted state. No secrets or codes touch the frontend.
     */
    const linkRiotAccount = async () => {
        if (!user?.id) return;
        try {
            const data = await apiClient.get<{ url: string }>('/api/integrations/riot/start');
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error('[useRiotAccount] Failed to start OAuth:', err);
        }
    };

    /**
     * Remove the linked Riot account.
     */
    const unlinkRiotAccount = async () => {
        if (!user?.id) return;
        await apiClient.delete('/api/integrations/riot');
        queryClient.invalidateQueries({ queryKey: ['riot-account', user.id] });
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    };

    return {
        riotAccount: riotAccount ?? null,
        isLoading,
        linkRiotAccount,
        unlinkRiotAccount,
        refetch,
    };
}
