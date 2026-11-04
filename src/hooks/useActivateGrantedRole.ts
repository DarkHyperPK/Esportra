import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRole } from '@/hooks/useRole';
import { fetchMeRoles, meRolesQueryKey } from '@/lib/meRoles';
import { userHasActiveRole } from '@/lib/sessionRole';

type SelfServeRole = 'organizer' | 'venue_owner';

/**
 * After a self-serve action that grants a role on the server (creating an
 * organization grants organizer, listing a venue grants venue_owner), refresh
 * /api/me/roles and make that role the active session role, so role-gated
 * routes open straight away instead of bouncing to /unauthorized.
 *
 * Returns true when the role is now active. The server stays the authority:
 * if the role was not granted, nothing is switched.
 */
export function useActivateGrantedRole() {
  const queryClient = useQueryClient();
  const { switchRole } = useRole();

  return useCallback(
    async (role: SelfServeRole): Promise<boolean> => {
      try {
        const roles = await queryClient.fetchQuery({
          queryKey: meRolesQueryKey,
          queryFn: fetchMeRoles,
          staleTime: 0,
        });
        if (!userHasActiveRole(roles?.userRoles, role)) return false;
        return await switchRole(role, undefined, { quiet: true });
      } catch {
        return false;
      }
    },
    [queryClient, switchRole],
  );
}
