import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
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
  const loadCurrentRole = async () => {
    if (!user) {
      setCurrentRole('casual');
      setIsLoading(false);
      return;
    }
    
    try {
      // Check for session role first (from localStorage)
      const sessionRole = localStorage.getItem('sessionRole') as UserRole;
      
      if (sessionRole && ['casual', 'organizer', 'venue_owner', 'admin'].includes(sessionRole)) {
        // Verify the user actually has this role in the multi-role system
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        const hasRole = userRoles?.some(r => r.role === sessionRole);
        const isAdmin = profile?.is_admin;
        
        if (hasRole || isAdmin || sessionRole === 'casual') {
          setCurrentRole(sessionRole);
          console.log('Using session role:', sessionRole);
          setIsLoading(false);
          return;
        }
      }
      
      // Fallback to user's active roles or base role
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });
      
      if (userRoles && userRoles.length > 0) {
        // Use the most recently assigned active role
        const activeRole = userRoles[0].role as UserRole;
        setCurrentRole(activeRole);
        localStorage.setItem('sessionRole', activeRole);
        console.log('Using active role from user_roles:', activeRole);
      } else {
        // Fallback to base role from profiles
        const { data: freshProfile, error } = await supabase
          .from('profiles')
          .select('base_role')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching fresh profile:', error);
          // Fallback to cached profile
          const userBaseRole = (profile?.role as UserRole) || 'casual';
          setCurrentRole(userBaseRole);
        } else {
          // Use fresh database data
          const userBaseRole = (freshProfile?.base_role as UserRole) || 'casual';
          setCurrentRole(userBaseRole);
          localStorage.setItem('sessionRole', userBaseRole);
          console.log('Using base role from profiles:', userBaseRole);
        }
      }
      
    } catch (error) {
      console.error('Error in loadCurrentRole:', error);
      // Fallback to cached profile
      const userBaseRole = (profile?.role as UserRole) || 'casual';
      setCurrentRole(userBaseRole);
    } finally {
      setIsLoading(false);
    }
  };

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
  const switchRole = async (newRole: UserRole, reason?: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to switch roles',
        variant: 'destructive',
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
      
      console.log('Attempting to switch role:', { newRole, reason });
      
      // Check if user has this role in the multi-role system
      if (newRole !== 'casual') {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        const hasRole = userRoles?.some(r => r.role === newRole);
        const isAdmin = profile?.is_admin;
        
        if (!hasRole && !isAdmin) {
          toast({ 
            title: 'Access Denied', 
            description: `You don't have the ${newRole.replace('_',' ')} role assigned.`, 
            variant: 'destructive' 
          });
          setIsLoading(false);
          return false;
        }

        // For organizer/venue_owner, check verification status
        if ((newRole === 'organizer' || newRole === 'venue_owner') && !isAdmin) {
          const { data: verifiedRoles } = await supabase
            .from('verified_roles')
            .select('status')
            .eq('user_id', user.id)
            .eq('role', newRole)
            .eq('status', 'approved')
            .limit(1);
          
          const isVerified = verifiedRoles && verifiedRoles.length > 0;
          
          if (!isVerified) {
            toast({ 
              title: 'Verification required', 
              description: `Your ${newRole.replace('_',' ')} verification is not approved yet.`, 
              variant: 'destructive' 
            });
            setIsLoading(false);
            return false;
          }
        }
      }

      // Session-based role switching - don't update database, just localStorage
      // This preserves the user's roles and verification status
      setCurrentRole(newRole);
      localStorage.setItem('sessionRole', newRole);
      
      // Do not write to DB here; keep it session-only to avoid RLS/column mismatches
      
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
  };

  // Reset to base role (clear session, return to database role)
  const resetToBaseRole = async () => {
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
  };

  // Force refresh role from database
  const refreshRoleFromDatabase = async () => {
    await loadCurrentRole();
  };

  // Permission checks - Admins can do everything
  const canCreateTeams = currentRole === 'casual' || currentRole === 'admin';
  const canCreateTournaments = currentRole === 'organizer' || currentRole === 'admin';
  const canManageTournaments = currentRole === 'organizer' || currentRole === 'admin';
  const canJoinTeams = currentRole === 'casual' || currentRole === 'admin';
  const canReportScores = currentRole === 'casual' || currentRole === 'admin';
  const canVerifyResults = currentRole === 'organizer' || currentRole === 'admin';

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
  }, [user?.id, profile?.id]);

  const value: RoleContextType = {
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
  };

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