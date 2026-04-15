import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

export interface SteamAccountData {
  steam64Id: string;
  steamName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  linkedAt: string | null;
  verified: boolean;
}

/**
 * Fetches the current user's linked Steam account.
 * Uses BFF pattern — Steam OpenID 2.0 flow is entirely server-side.
 */
export function useSteamAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: steamAccount, isLoading, refetch } = useQuery<SteamAccountData | null>({
    queryKey: ['steam-account', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        return await apiClient.get<SteamAccountData>('/api/accounts/steam');
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
  });

  // When another tab completes Steam linking, refresh this tab's cache
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'steam_just_linked') {
        queryClient.invalidateQueries({ queryKey: ['steam-account'] });
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [queryClient]);

  /**
   * Start Steam OpenID 2.0 via BFF — backend builds the redirect URL.
   * Opens in a new tab so the user can complete Steam login.
   */
  const linkSteamAccount = async () => {
    if (!user?.id) return;
    // The /api/accounts/steam/auth endpoint returns a 302 redirect to Steam.
    // We open it in the current window so the redirect chain works.
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    window.location.href = `${baseUrl}/api/accounts/steam/auth`;
  };

  /**
   * Remove the linked Steam account.
   */
  const unlinkSteamAccount = async () => {
    if (!user?.id) return;
    await apiClient.delete('/api/accounts/steam');
    queryClient.invalidateQueries({ queryKey: ['steam-account', user.id] });
    queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
  };

  return {
    steamAccount: steamAccount ?? null,
    isLoading,
    linkSteamAccount,
    unlinkSteamAccount,
    refetch,
  };
}
