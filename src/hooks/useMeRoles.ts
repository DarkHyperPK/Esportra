import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchMeRoles, meRolesQueryKey, type MeRolesResponse } from '@/lib/meRoles';

/** Shared /api/me/roles query — dedupes RoleContext, UserMenu, RoleSwitcher. */
export function useMeRoles(enabled = true) {
  const { user } = useAuth();
  return useQuery<MeRolesResponse>({
    queryKey: meRolesQueryKey,
    queryFn: fetchMeRoles,
    enabled: enabled && !!user,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
