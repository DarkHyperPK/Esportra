import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

export type DualRoleMode = 'player' | 'organizer' | 'venue_owner';

interface PlayerProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  gaming_stats: {
    tournaments_played: number;
    tournaments_won: number;
    teams_created: number;
    teams_joined: number;
    total_earnings: number;
  };
  preferences: {
    favorite_games: string[];
    preferred_team_size: number;
    skill_level: string;
  };
}

interface OrganizerProfile {
  id: string;
  company_name: string;
  company_logo?: string;
  business_type: string;
  website?: string;
  contact_email: string;
  business_stats: {
    tournaments_created: number;
    total_participants: number;
    total_prize_pool: number;
    active_tournaments: number;
    total_revenue: number;
  };
  verification_status: 'pending' | 'verified' | 'rejected';
}

interface VenueOwnerProfile {
  id: string;
  venue_name: string;
  venue_logo?: string;
  venue_type: string;
  location: string;
  contact_email: string;
  venue_stats: {
    venues_listed: number;
    tournaments_hosted: number;
    total_capacity: number;
    total_revenue: number;
  };
  verification_status: 'pending' | 'verified' | 'rejected';
}

interface DualRoleContextType {
  currentMode: DualRoleMode;
  playerProfile: PlayerProfile | null;
  organizerProfile: OrganizerProfile | null;
  venueOwnerProfile: VenueOwnerProfile | null;
  isLoading: boolean;
  switchMode: (mode: DualRoleMode) => Promise<boolean>;
  canAccessMode: (mode: DualRoleMode) => boolean;
  currentDisplayName: string;
  currentAvatar: string | null;
  // Financial tracking
  playerEarnings: number;
  organizerRevenue: number;
  venueRevenue: number;
  // Dashboard data
  playerDashboard: {
    upcomingTournaments: any[];
    teamMemberships: any[];
    recentActivity: any[];
  };
  organizerDashboard: {
    myTournaments: any[];
    pendingApprovals: any[];
    revenue: any[];
  };
  venueDashboard: {
    myVenues: any[];
    hostedEvents: any[];
    bookings: any[];
  };
}

const DualRoleContext = createContext<DualRoleContextType | undefined>(undefined);

interface DualRoleProviderProps {
  children: ReactNode;
}

export const DualRoleProvider: React.FC<DualRoleProviderProps> = ({ children }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [currentMode, setCurrentMode] = useState<DualRoleMode>('player');
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [venueOwnerProfile, setVenueOwnerProfile] = useState<VenueOwnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Financial tracking
  const [playerEarnings, setPlayerEarnings] = useState(0);
  const [organizerRevenue, setOrganizerRevenue] = useState(0);
  const [venueRevenue, setVenueRevenue] = useState(0);
  
  // Dashboard data
  const [playerDashboard, setPlayerDashboard] = useState({
    upcomingTournaments: [],
    teamMemberships: [],
    recentActivity: []
  });
  const [organizerDashboard, setOrganizerDashboard] = useState({
    myTournaments: [],
    pendingApprovals: [],
    revenue: []
  });
  const [venueDashboard, setVenueDashboard] = useState({
    myVenues: [],
    hostedEvents: [],
    bookings: []
  });

  // Load all profiles and data
  const loadProfiles = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Load player profile (from main profile)
      if (profile) {
        const player: PlayerProfile = {
          id: profile.id,
          username: profile.username || '',
          full_name: profile.full_name || '',
          avatar_url: profile.avatar_url,
          gaming_stats: {
            tournaments_played: 0, // TODO: Calculate from database
            tournaments_won: 0,
            teams_created: 0,
            teams_joined: 0,
            total_earnings: 0
          },
          preferences: {
            favorite_games: [],
            preferred_team_size: 5,
            skill_level: 'intermediate'
          }
        };
        setPlayerProfile(player);
      }

      // Organizer profile - removed company_profiles dependency
      // Set empty organizer profile for now
      setOrganizerProfile(null);

      // Load venue owner profile
      try {
        const { data: venueData } = await supabase
          .from('venue_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (venueData) {
          const venueOwner: VenueOwnerProfile = {
            id: venueData.id,
            venue_name: venueData.venue_name,
            venue_logo: venueData.venue_logo,
            venue_type: venueData.venue_type,
            location: venueData.location,
            contact_email: venueData.contact_email,
            venue_stats: {
              venues_listed: 0, // TODO: Calculate from database
              tournaments_hosted: 0,
              total_capacity: 0,
              total_revenue: 0
            },
            verification_status: venueData.is_verified ? 'verified' : 'pending'
          };
          setVenueOwnerProfile(venueOwner);
        }
      } catch (error) {
        console.log('No venue owner profile found');
      }

      // Load current mode from localStorage
      const savedMode = localStorage.getItem('dualRoleMode') as DualRoleMode;
      if (savedMode && ['player', 'organizer', 'venue_owner'].includes(savedMode)) {
        setCurrentMode(savedMode);
      }

    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch between modes
  const switchMode = async (mode: DualRoleMode): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to switch modes',
        variant: 'destructive',
      });
      return false;
    }

    // Check if user has access to this mode
    if (!canAccessMode(mode)) {
      toast({
        title: 'Access Denied',
        description: `You don't have access to ${mode} mode`,
        variant: 'destructive',
      });
      return false;
    }

    try {
      setCurrentMode(mode);
      localStorage.setItem('dualRoleMode', mode);
      
      toast({
        title: 'Mode Switched',
        description: `Switched to ${mode} mode`,
        variant: 'default',
      });
      return true;
    } catch (error) {
      console.error('Error switching mode:', error);
      toast({
        title: 'Error',
        description: 'Failed to switch mode',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Check if user can access a specific mode
  const canAccessMode = (mode: DualRoleMode): boolean => {
    switch (mode) {
      case 'player':
        return true; // Everyone can be a player
      case 'organizer':
        return profile?.role === 'admin' || organizerProfile?.verification_status === 'verified';
      case 'venue_owner':
        return profile?.role === 'admin' || venueOwnerProfile?.verification_status === 'verified';
      default:
        return false;
    }
  };

  // Current display information
  const currentDisplayName = (() => {
    switch (currentMode) {
      case 'player':
        return playerProfile?.full_name || playerProfile?.username || 'Player';
      case 'organizer':
        return organizerProfile?.company_name || 'Organizer';
      case 'venue_owner':
        return venueOwnerProfile?.venue_name || 'Venue Owner';
      default:
        return 'User';
    }
  })();

  const currentAvatar = (() => {
    switch (currentMode) {
      case 'player':
        return playerProfile?.avatar_url;
      case 'organizer':
        return organizerProfile?.company_logo;
      case 'venue_owner':
        return venueOwnerProfile?.venue_logo;
      default:
        return null;
    }
  })();

  useEffect(() => {
    loadProfiles();
  }, [user, profile]);

  const value: DualRoleContextType = {
    currentMode,
    playerProfile,
    organizerProfile,
    venueOwnerProfile,
    isLoading,
    switchMode,
    canAccessMode,
    currentDisplayName,
    currentAvatar,
    playerEarnings,
    organizerRevenue,
    venueRevenue,
    playerDashboard,
    organizerDashboard,
    venueDashboard,
  };

  return (
    <DualRoleContext.Provider value={value}>
      {children}
    </DualRoleContext.Provider>
  );
};

export const useDualRole = (): DualRoleContextType => {
  const context = useContext(DualRoleContext);
  if (context === undefined) {
    throw new Error('useDualRole must be used within a DualRoleProvider');
  }
  return context;
};
