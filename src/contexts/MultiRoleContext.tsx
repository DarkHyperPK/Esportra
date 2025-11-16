import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'casual' | 'organizer' | 'venue_owner' | 'admin';

export interface UserRoleInfo {
  role: UserRole;
  is_primary: boolean;
  assigned_at: string;
}

export interface Permission {
  permission: string;
  resource: string;
  action: string;
}

interface MultiRoleContextType {
  // Current state
  activeRoles: UserRoleInfo[];
  primaryRole: UserRole | null;
  permissions: Permission[];
  isLoading: boolean;
  
  // Role management
  assignRole: (role: UserRole, isPrimary?: boolean) => Promise<boolean>;
  removeRole: (role: UserRole) => Promise<boolean>;
  setPrimaryRole: (role: UserRole) => Promise<boolean>;
  
  // Permission checks
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasAllRoles: (roles: UserRole[]) => boolean;
  
  // Feature access checks
  canCreateTeams: boolean;
  canCreateTournaments: boolean;
  canManageTournaments: boolean;
  canCreateVenues: boolean;
  canManageVenues: boolean;
  canJoinTeams: boolean;
  canJoinTournaments: boolean;
  canReportScores: boolean;
  canVerifyResults: boolean;
  canAssignRoles: boolean;
  canVerifyUsers: boolean;
  
  // Utility functions
  refreshRoles: () => Promise<void>;
  getRoleDisplayName: (role: UserRole) => string;
  getRoleDescription: (role: UserRole) => string;
}

const MultiRoleContext = createContext<MultiRoleContextType | undefined>(undefined);

export const useMultiRole = (): MultiRoleContextType => {
  const context = useContext(MultiRoleContext);
  if (!context) {
    throw new Error('useMultiRole must be used within a MultiRoleProvider');
  }
  return context;
};

interface MultiRoleProviderProps {
  children: React.ReactNode;
}

export const MultiRoleProvider: React.FC<MultiRoleProviderProps> = ({ children }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [activeRoles, setActiveRoles] = useState<UserRoleInfo[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load user roles and permissions
  const loadUserRoles = useCallback(async () => {
    if (!user) {
      setActiveRoles([]);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get user roles
      const { data: rolesData, error: rolesError } = await supabase
        .rpc('get_user_roles', { p_user_id: user.id });

      if (rolesError) {
        console.error('Error loading user roles:', rolesError);
        throw rolesError;
      }

      setActiveRoles(rolesData || []);

      // Get user permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .rpc('get_user_permissions', { p_user_id: user.id });

      if (permissionsError) {
        console.error('Error loading user permissions:', permissionsError);
        throw permissionsError;
      }

      setPermissions(permissionsData || []);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user roles and permissions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Load roles when user changes
  useEffect(() => {
    loadUserRoles();
  }, [loadUserRoles]);

  // Role management functions
  const assignRole = useCallback(async (role: UserRole, isPrimary: boolean = false): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .rpc('assign_user_role', {
          p_user_id: user.id,
          p_role: role,
          p_assigned_by: user.id,
          p_is_primary: isPrimary
        });

      if (error) {
        console.error('Error assigning role:', error);
        toast({
          title: 'Error',
          description: `Failed to assign ${role} role`,
          variant: 'destructive',
        });
        return false;
      }

      await loadUserRoles();
      toast({
        title: 'Role Assigned',
        description: `Successfully assigned ${role} role`,
        variant: 'default',
      });
      return true;
    } catch (error) {
      console.error('Error assigning role:', error);
      return false;
    }
  }, [user, loadUserRoles, toast]);

  const removeRole = useCallback(async (role: UserRole): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .rpc('remove_user_role', {
          p_user_id: user.id,
          p_role: role
        });

      if (error) {
        console.error('Error removing role:', error);
        toast({
          title: 'Error',
          description: `Failed to remove ${role} role`,
          variant: 'destructive',
        });
        return false;
      }

      await loadUserRoles();
      toast({
        title: 'Role Removed',
        description: `Successfully removed ${role} role`,
        variant: 'default',
      });
      return true;
    } catch (error) {
      console.error('Error removing role:', error);
      return false;
    }
  }, [user, loadUserRoles, toast]);

  const setPrimaryRole = useCallback(async (role: UserRole): Promise<boolean> => {
    if (!user) return false;

    try {
      // First ensure the role exists
      const hasRole = activeRoles.some(r => r.role === role);
      if (!hasRole) {
        await assignRole(role, true);
        return true;
      }

      // Update the primary role
      const { error } = await supabase
        .from('user_roles')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      if (error) throw error;

      const { error: setPrimaryError } = await supabase
        .from('user_roles')
        .update({ is_primary: true })
        .eq('user_id', user.id)
        .eq('role', role);

      if (setPrimaryError) throw setPrimaryError;

      await loadUserRoles();
      toast({
        title: 'Primary Role Updated',
        description: `Set ${role} as your primary role`,
        variant: 'default',
      });
      return true;
    } catch (error) {
      console.error('Error setting primary role:', error);
      return false;
    }
  }, [user, activeRoles, assignRole, loadUserRoles, toast]);

  // Permission check functions
  const hasRole = useCallback((role: UserRole): boolean => {
    return activeRoles.some(r => r.role === role);
  }, [activeRoles]);

  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.some(p => p.permission === permission);
  }, [permissions]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return roles.some(role => hasRole(role));
  }, [hasRole]);

  const hasAllRoles = useCallback((roles: UserRole[]): boolean => {
    return roles.every(role => hasRole(role));
  }, [hasRole]);

  // Computed properties
  const primaryRole = activeRoles.find(r => r.is_primary)?.role || null;

  // Feature access checks
  const canCreateTeams = hasPermission('create_teams');
  const canCreateTournaments = hasPermission('create_tournaments');
  const canManageTournaments = hasPermission('manage_tournaments');
  const canCreateVenues = hasPermission('create_venues');
  const canManageVenues = hasPermission('manage_venues');
  const canJoinTeams = hasPermission('join_teams');
  const canJoinTournaments = hasPermission('join_tournaments');
  const canReportScores = hasPermission('report_scores');
  const canVerifyResults = hasPermission('verify_results');
  const canAssignRoles = hasPermission('assign_roles');
  const canVerifyUsers = hasPermission('verify_users');

  // Utility functions
  const getRoleDisplayName = useCallback((role: UserRole): string => {
    const names: Record<UserRole, string> = {
      casual: 'Player',
      organizer: 'Organizer',
      venue_owner: 'Venue Owner',
      admin: 'Admin'
    };
    return names[role];
  }, []);

  const getRoleDescription = useCallback((role: UserRole): string => {
    const descriptions: Record<UserRole, string> = {
      casual: 'Create teams, join tournaments, compete in matches',
      organizer: 'Create tournaments, manage events, verify results',
      venue_owner: 'List venues, manage bookings, host events',
      admin: 'Full platform access and management capabilities'
    };
    return descriptions[role];
  }, []);

  const refreshRoles = useCallback(async () => {
    await loadUserRoles();
  }, [loadUserRoles]);

  const value: MultiRoleContextType = {
    // Current state
    activeRoles,
    primaryRole,
    permissions,
    isLoading,
    
    // Role management
    assignRole,
    removeRole,
    setPrimaryRole,
    
    // Permission checks
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllRoles,
    
    // Feature access checks
    canCreateTeams,
    canCreateTournaments,
    canManageTournaments,
    canCreateVenues,
    canManageVenues,
    canJoinTeams,
    canJoinTournaments,
    canReportScores,
    canVerifyResults,
    canAssignRoles,
    canVerifyUsers,
    
    // Utility functions
    refreshRoles,
    getRoleDisplayName,
    getRoleDescription,
  };

  return (
    <MultiRoleContext.Provider value={value}>
      {children}
    </MultiRoleContext.Provider>
  );
};
