import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

export type IdentityMode = 'personal' | 'company';

interface PersonalProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  gaming_stats?: {
    tournaments_played: number;
    tournaments_won: number;
    teams_created: number;
    teams_joined: number;
  };
}

interface CompanyProfile {
  id: string;
  company_name: string;
  company_logo?: string;
  company_description?: string;
  website?: string;
  contact_email?: string;
  business_stats?: {
    tournaments_created: number;
    total_participants: number;
    total_prize_pool: number;
    active_tournaments: number;
  };
}

interface IdentityContextType {
  currentMode: IdentityMode;
  personalProfile: PersonalProfile | null;
  companyProfile: CompanyProfile | null;
  isLoading: boolean;
  switchMode: (mode: IdentityMode) => Promise<boolean>;
  canCreateTournaments: boolean;
  canCreateTeams: boolean;
  canManageCompany: boolean;
  currentDisplayName: string;
  currentAvatar: string | null;
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

interface IdentityProviderProps {
  children: ReactNode;
}

export const IdentityProvider: React.FC<IdentityProviderProps> = ({ children }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [currentMode, setCurrentMode] = useState<IdentityMode>('personal');
  const [personalProfile, setPersonalProfile] = useState<PersonalProfile | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user's current identity mode and profiles
  const loadIdentityData = async () => {
    if (!user) {
      setPersonalProfile(null);
      setCompanyProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Load personal profile (from existing profile data)
      if (profile) {
        const personal: PersonalProfile = {
          id: profile.id,
          username: profile.username || '',
          full_name: profile.full_name || '',
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          gaming_stats: {
            tournaments_played: 0, // TODO: Calculate from database
            tournaments_won: 0,
            teams_created: 0,
            teams_joined: 0,
          }
        };
        setPersonalProfile(personal);
      }

      // Company profiles removed - no longer needed

      // Load current mode from localStorage
      const savedMode = localStorage.getItem('identityMode') as IdentityMode;
      if (savedMode && (savedMode === 'personal' || savedMode === 'company')) {
        setCurrentMode(savedMode);
      }

    } catch (error) {
      console.error('Error loading identity data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch between personal and company modes
  const switchMode = async (mode: IdentityMode): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to switch identity modes',
        variant: 'destructive',
      });
      return false;
    }

    // Only allow company mode for organizers
    if (mode === 'company' && profile?.role !== 'organizer') {
      toast({
        title: 'Access Denied',
        description: 'Only organizers can access company mode',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setCurrentMode(mode);
      localStorage.setItem('identityMode', mode);
      
      toast({
        title: 'Identity Switched',
        description: `Switched to ${mode === 'personal' ? 'Personal' : 'Company'} mode`,
        variant: 'default',
      });
      return true;
    } catch (error) {
      console.error('Error switching identity mode:', error);
      toast({
        title: 'Error',
        description: 'Failed to switch identity mode',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Permission checks based on current mode
  const canCreateTournaments = currentMode === 'company' && profile?.role === 'organizer';
  const canCreateTeams = currentMode === 'personal';
  const canManageCompany = currentMode === 'company' && profile?.role === 'organizer';

  // Current display information
  const currentDisplayName = currentMode === 'personal' 
    ? (personalProfile?.full_name || personalProfile?.username || 'Player')
    : (companyProfile?.company_name || 'Company');

  const currentAvatar = currentMode === 'personal'
    ? personalProfile?.avatar_url
    : companyProfile?.company_logo;

  useEffect(() => {
    loadIdentityData();
  }, [user, profile]);

  const value: IdentityContextType = {
    currentMode,
    personalProfile,
    companyProfile,
    isLoading,
    switchMode,
    canCreateTournaments,
    canCreateTeams,
    canManageCompany,
    currentDisplayName,
    currentAvatar,
  };

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
};

export const useIdentity = (): IdentityContextType => {
  const context = useContext(IdentityContext);
  if (context === undefined) {
    throw new Error('useIdentity must be used within an IdentityProvider');
  }
  return context;
};
