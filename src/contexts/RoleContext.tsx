import React, { useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useMeRoles } from '@/hooks/useMeRoles';
import { fetchMeRoles, meRolesQueryKey, isApprovedVerifiedRole } from '@/lib/meRoles';
import {
  clearStoredSessionRole,
  getStoredSessionRole,
  isValidSessionRole,
  resolveActiveRole,
  setStoredSessionRole,
  syncStoredSessionRole,
} from '@/lib/sessionRole';
import { RoleContext, type RoleContextType, type UserRole } from '@/contexts/role-context';

export type { UserRole };

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentRole, setCurrentRole] = useState<UserRole>('casual');
  const [isLoading, setIsLoading] = useState(true);
  const { data: rolesData, isLoading: rolesQueryLoading } = useMeRoles(!!user);
  const rolesDataRef = React.useRef(rolesData);
  rolesDataRef.current = rolesData;

  const prevProfileRoleRef = React.useRef<string | null>(null);
  const prevUserIdRef = React.useRef<string | null>(null);

  const loadCurrentRole = React.useCallback(() => {
    if (!user?.id) {
      setCurrentRole('casual');
      setIsLoading(false);
      return;
    }

    try {
      const isAdmin = profile?.is_admin || false;
      const adminRoles = (profile?.admin_roles as string[]) || [];
      const isSuperAdmin = adminRoles.includes('super_admin');

      if (isAdmin) {
        const adminRole: UserRole = isSuperAdmin ? 'admin' : 'casual';
        setCurrentRole(adminRole);
        setStoredSessionRole(user.id, adminRole);
        setIsLoading(false);
        return;
      }

      const storedSessionRole = getStoredSessionRole(user.id);
      const rolesList = rolesDataRef.current?.userRoles;
      const profileRole =
        (profile?.base_role as UserRole) ||
        (profile?.role as UserRole) ||
        'casual';

      const resolvedRole = resolveActiveRole({
        storedSessionRole,
        userRoles: rolesList,
        profileRole,
      });

      setCurrentRole(resolvedRole);
      syncStoredSessionRole(user.id, storedSessionRole, resolvedRole);
    } catch (error) {
      console.error('Error in loadCurrentRole:', error);
      const storedSessionRole = getStoredSessionRole(user.id);
      const fallbackRole = storedSessionRole ?? (profile?.role as UserRole) ?? 'casual';
      setCurrentRole(fallbackRole);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, profile]);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (prevUserIdRef.current !== currentUserId) {
      prevProfileRoleRef.current = null;
      prevUserIdRef.current = currentUserId;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !profile?.role) return;

    const currentProfileRole = profile.role;
    const prevProfileRole = prevProfileRoleRef.current;

    if (currentProfileRole === prevProfileRole) {
      return;
    }

    prevProfileRoleRef.current = currentProfileRole;

    const storedSessionRole = getStoredSessionRole(user.id);

    if (!isValidSessionRole(storedSessionRole)) {
      setCurrentRole(currentProfileRole as UserRole);
      setStoredSessionRole(user.id, currentProfileRole as UserRole);
    }
  }, [user?.id, profile?.role]);

  const switchRole = React.useCallback(async (newRole: UserRole, _reason?: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to switch roles',
        variant: 'destructive',
      });
      return false;
    }

    const isAdmin = profile?.is_admin;
    if (isAdmin) {
      const adminRoles = (profile?.admin_roles as string[]) || [];
      const isSuperAdmin = adminRoles.includes('super_admin');

      if (isSuperAdmin) {
        toast({
          title: 'Super Admin',
          description: 'Super admins have access to all features without switching roles.',
          variant: 'default',
        });
        return false;
      }

      toast({
        title: 'Admin Account',
        description: 'Admin accounts stay on casual role. Your admin permissions are active.',
        variant: 'default',
      });
      return false;
    }

    if (newRole === currentRole) {
      toast({
        title: 'Already in Role',
        description: `You are already in ${newRole} mode`,
        variant: 'default',
      });
      return true;
    }

    try {
      setIsLoading(true);

      if (newRole !== 'casual') {
        let latestRoles: Awaited<ReturnType<typeof fetchMeRoles>>;
        try {
          latestRoles = await queryClient.fetchQuery({
            queryKey: meRolesQueryKey,
            queryFn: fetchMeRoles,
            staleTime: 5 * 60_000,
          });
        } catch {
          latestRoles = { userRoles: [], verifiedRoles: [] };
        }

        const hasRole = latestRoles.userRoles?.some(
          (entry) =>
            entry.role === newRole &&
            (entry.is_active ?? entry.isActive ?? true),
        );

        if (!hasRole) {
          toast({
            title: 'Access Denied',
            description: `You don't have the ${newRole.replace('_', ' ')} role assigned.`,
            variant: 'destructive',
          });
          setIsLoading(false);
          return false;
        }

        if (newRole === 'organizer' || newRole === 'venue_owner') {
          const isVerified = latestRoles.verifiedRoles?.some(
            (entry) => entry.role === newRole && isApprovedVerifiedRole(entry),
          );

          if (!isVerified) {
            toast({
              title: 'Verification required',
              description: `Your ${newRole.replace('_', ' ')} verification is not approved yet.`,
              variant: 'destructive',
            });
            setIsLoading(false);
            return false;
          }
        }
      }

      setCurrentRole(newRole);
      setStoredSessionRole(user.id, newRole);

      toast({
        title: 'Role Switched',
        description: `Successfully switched to ${newRole} mode`,
        variant: 'default',
      });
      return true;
    } catch (error) {
      console.error('Error switching role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to switch role',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, profile, currentRole, toast, queryClient]);

  const resetToBaseRole = React.useCallback(async () => {
    if (!user) return;

    const userBaseRole = (profile?.role as UserRole) || 'casual';

    try {
      setCurrentRole(userBaseRole);
      setStoredSessionRole(user.id, userBaseRole);

      toast({
        title: 'Role Reset',
        description: `Switched back to your base role: ${userBaseRole}`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error resetting role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset role',
        variant: 'destructive',
      });
    }
  }, [user, profile, toast]);

  const refreshRoleFromDatabase = React.useCallback(async () => {
    if (!user?.id) return;
    clearStoredSessionRole(user.id);
    loadCurrentRole();
  }, [user?.id, loadCurrentRole]);

  const isSuperAdmin = profile?.is_admin && (profile?.admin_roles as string[])?.includes('super_admin');

  const canCreateTeams = currentRole === 'casual' || isSuperAdmin;
  const canCreateTournaments = currentRole === 'organizer' || isSuperAdmin;
  const canManageTournaments = currentRole === 'organizer' || isSuperAdmin;
  const canJoinTeams = currentRole === 'casual' || isSuperAdmin;
  const canReportScores = currentRole === 'casual' || isSuperAdmin;
  const canVerifyResults = currentRole === 'organizer' || isSuperAdmin;

  // Resolve once auth + /api/me/roles have settled. Intentionally omit rolesData from deps
  // so background refetches do not re-run role resolution and clobber manual picks.
  useEffect(() => {
    if (!user?.id) {
      setCurrentRole('casual');
      setIsLoading(false);
      return;
    }

    if (rolesQueryLoading) {
      setIsLoading(true);
      return;
    }

    loadCurrentRole();
  }, [user?.id, profile?.id, profile?.is_admin, rolesQueryLoading, loadCurrentRole]);

  const value: RoleContextType = React.useMemo(() => ({
    currentRole,
    isLoading,
    switchRole,
    resetToBaseRole,
    refreshRoleFromDatabase,
    canCreateTeams,
    canCreateTournaments,
    canManageTournaments,
    canJoinTeams,
    canReportScores,
    canVerifyResults,
  }), [
    currentRole,
    isLoading,
    switchRole,
    resetToBaseRole,
    refreshRoleFromDatabase,
    canCreateTeams,
    canCreateTournaments,
    canManageTournaments,
    canJoinTeams,
    canReportScores,
    canVerifyResults,
  ]);

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};
