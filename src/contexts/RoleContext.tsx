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

  // Load user's current role directly from profile (DB is source of truth)
  const loadCurrentRole = async () => {
    if (!user) {
      setCurrentRole('casual');
      setIsLoading(false);
      return;
    }
    const userBaseRole = (profile?.role as UserRole) || 'casual';
    setCurrentRole(userBaseRole);
    setIsLoading(false);
  };

  // Update role when profile changes (DB-driven)
  useEffect(() => {
    if (profile?.role) {
      setCurrentRole(profile.role as UserRole);
    }
  }, [profile?.role]);

  // Switch user role by updating the profile (DB + state)
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
      
      const userBaseRole = profile?.role as UserRole;

      // If switching into organizer/venue_owner from casual, ensure verified
      if ((newRole === 'organizer' || newRole === 'venue_owner') && userBaseRole !== newRole) {
        const { data, error } = await supabase
          .from('verification_requests')
          .select('status')
          .eq('user_id', user!.id)
          .eq('requested_role', newRole)
          .eq('status', 'approved')
          .limit(1);
        if (error || !data || data.length === 0) {
          toast({ title: 'Verification required', description: `Your ${newRole.replace('_',' ')} verification is not approved yet.`, variant: 'destructive' });
          setIsLoading(false);
          return false;
        }
      }

      // Persist to DB
      await updateProfile({ role: newRole });
      setCurrentRole(newRole);
      
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

  // Reset to base role (clear session)
  const resetToBaseRole = () => {
    const userBaseRole = profile?.role as UserRole || 'casual';
    setCurrentRole(userBaseRole);
    localStorage.removeItem('sessionRole');
  };

  // Permission checks
  const canCreateTeams = currentRole === 'casual';
  const canCreateTournaments = currentRole === 'organizer';
  const canManageTournaments = currentRole === 'organizer';
  const canJoinTeams = currentRole === 'casual';
  const canReportScores = currentRole === 'casual';
  const canVerifyResults = currentRole === 'organizer';

  useEffect(() => {
    loadCurrentRole();
  }, [user, profile]);

  const value: RoleContextType = {
    currentRole,
    isLoading,
    switchRole,
    resetToBaseRole,
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