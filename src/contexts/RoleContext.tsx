import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'casual' | 'organizer' | 'venue_owner' | 'admin';

interface RoleContextType {
  currentRole: UserRole;
  isLoading: boolean;
  switchRole: (newRole: UserRole, reason?: string) => Promise<boolean>;
  resetToBaseRole: () => void;
  refreshRoleFromDatabase: () => Promise<void>;
  canCreateTeams: boolean;
  canCreateTournaments: boolean;
  canManageTournaments: boolean;
  canJoinTeams: boolean;
  canReportScores: boolean;
  canVerifyResults: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [currentRole, setCurrentRole] = useState<UserRole>('casual');
  const [isLoading, setIsLoading] = useState(true);

  // Load user's current role (session role takes priority over database role)
  const loadCurrentRole = React.useCallback(async () => {
    if (!user) {
      setCurrentRole('casual');
      setIsLoading(false);
      return;
    }

    try {
      // Use profile from AuthContext instead of querying the DB again
      const isAdmin = profile?.is_admin || false;
      const adminRoles = (profile?.admin_roles as string[]) || [];
      const isSuperAdmin = adminRoles.includes('super_admin');

      // If user is admin, set role based on admin type
      if (isAdmin) {
        const adminRole: UserRole = isSuperAdmin ? 'admin' : 'casual';
        setCurrentRole(adminRole);
        localStorage.setItem('sessionRole', adminRole);
        setIsLoading(false);
        return;
      }

      // Check for session role first (from localStorage) - only for non-admins
      const sessionRole = localStorage.getItem('sessionRole') as UserRole;

      // Fetch roles from API once for both checks
      let rolesList: Array<{ role: string }> = [];
      try {
        const rolesData = await apiClient.get<{ userRoles: Array<{ role: string; is_active: boolean }>; verifiedRoles: any[] }>('/api/me/roles');
        rolesList = rolesData.userRoles || [];
      } catch {
        rolesList = [];
      }

      if (sessionRole && ['casual', 'organizer', 'venue_owner'].includes(sessionRole)) {
        const hasRole = rolesList.some(r => r.role === sessionRole);

        if (hasRole || sessionRole === 'casual') {
          setCurrentRole(sessionRole);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to user's active roles or base role
      if (rolesList.length > 0) {
        const activeRole = rolesList[0].role as UserRole;
        setCurrentRole(activeRole);
        localStorage.setItem('sessionRole', activeRole);
      } else {
        // Fallback to base role from the already-loaded profile
        const userBaseRole = (profile?.base_role as UserRole) || (profile?.role as UserRole) || 'casual';
        setCurrentRole(userBaseRole);
        localStorage.setItem('sessionRole', userBaseRole);
      }

    } catch (error) {
      console.error('Error in loadCurrentRole:', error);
      // Fallback to cached profile
      const userBaseRole = (profile?.role as UserRole) || 'casual';
      setCurrentRole(userBaseRole);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile]);

  // Update role when profile changes (but don't override session role)
  // Use ref to track previous profile role to avoid unnecessary updates
  const prevProfileRoleRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (profile?.role) {
      const currentProfileRole = profile.role;
      const prevProfileRole = prevProfileRoleRef.current;

      // Only update if profile role actually changed
      if (currentProfileRole === prevProfileRole) {
        return;
      }

      prevProfileRoleRef.current = currentProfileRole;

      const sessionRole = localStorage.getItem('sessionRole') as UserRole;

      // Only use database role if no session role is set
      if (!sessionRole || !['casual', 'organizer', 'venue_owner', 'admin'].includes(sessionRole)) {
        setCurrentRole(currentProfileRole as UserRole);
        localStorage.setItem('sessionRole', currentProfileRole);
      }
    }
  }, [profile?.role]);

  // Switch user role (session-based, works with multi-role system)
  const switchRole = React.useCallback(async (newRole: UserRole, reason?: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to switch roles',
        variant: 'destructive',
      });
      return false;
    }

    // Prevent admins from switching roles (except super admin can't switch - they already have all perks)
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
      } else {
        toast({
          title: 'Admin Account',
          description: 'Admin accounts stay on casual role. Your admin permissions are active.',
          variant: 'default',
        });
        return false;
      }
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

      // Check if user has this role in the multi-role system
      if (newRole !== 'casual') {
        let rolesData: { userRoles: Array<{ role: string }>; verifiedRoles: Array<{ role: string; status: string; is_active: boolean }> };
        try {
          rolesData = await apiClient.get<typeof rolesData>('/api/me/roles');
        } catch {
          rolesData = { userRoles: [], verifiedRoles: [] };
        }

        const hasRole = rolesData.userRoles?.some(r => r.role === newRole);

        if (!hasRole) {
          toast({
            title: 'Access Denied',
            description: `You don't have the ${newRole.replace('_', ' ')} role assigned.`,
            variant: 'destructive'
          });
          setIsLoading(false);
          return false;
        }

        // For organizer/venue_owner, check verification status (must be approved AND active)
        if (newRole === 'organizer' || newRole === 'venue_owner') {
          const isVerified = rolesData.verifiedRoles?.some(
            r => r.role === newRole && r.status === 'approved' && r.is_active
          );

          if (!isVerified) {
            toast({
              title: 'Verification required',
              description: `Your ${newRole.replace('_', ' ')} verification is not approved yet.`,
              variant: 'destructive'
            });
            setIsLoading(false);
            return false;
          }
        }
      }

      // Session-based role switching - don't update database, just localStorage
      setCurrentRole(newRole);
      localStorage.setItem('sessionRole', newRole);

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
  }, [user, profile, currentRole, toast]);

  // Reset to base role (clear session, return to database role)
  const resetToBaseRole = React.useCallback(async () => {
    if (!user) return;

    const userBaseRole = profile?.role as UserRole || 'casual';

    try {
      // Clear session role and return to database role
      setCurrentRole(userBaseRole);
      localStorage.removeItem('sessionRole');

      // Session-only reset; no DB write

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

  // Force refresh role from database
  const refreshRoleFromDatabase = React.useCallback(async () => {
    await loadCurrentRole();
  }, [loadCurrentRole]);

  // Permission checks - Super admin gets all perks, other admins stay on casual
  const isSuperAdmin = profile?.is_admin && (profile?.admin_roles as string[])?.includes('super_admin');
  const isAdmin = profile?.is_admin;

  // Super admin: gets all perks (casual, organizer, venue owner) without switching
  // Other admins: stay on casual, get their specific admin role perks
  const canCreateTeams = currentRole === 'casual' || isSuperAdmin;
  const canCreateTournaments = currentRole === 'organizer' || isSuperAdmin;
  const canManageTournaments = currentRole === 'organizer' || isSuperAdmin;
  const canJoinTeams = currentRole === 'casual' || isSuperAdmin;
  const canReportScores = currentRole === 'casual' || isSuperAdmin;
  const canVerifyResults = currentRole === 'organizer' || isSuperAdmin;

  // Track previous user ID to prevent unnecessary reloads
  const prevUserIdRef = React.useRef<string | null>(null);
  const prevProfileIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    const currentUserId = user?.id || null;
    const currentProfileId = profile?.id || null;
    const prevUserId = prevUserIdRef.current;
    const prevProfileId = prevProfileIdRef.current;

    // Only reload if user or profile actually changed
    if (currentUserId !== prevUserId || currentProfileId !== prevProfileId) {
      prevUserIdRef.current = currentUserId;
      prevProfileIdRef.current = currentProfileId;
      loadCurrentRole();
    }
  }, [user?.id, profile?.id, loadCurrentRole]);

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
    canVerifyResults
  ]);

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
