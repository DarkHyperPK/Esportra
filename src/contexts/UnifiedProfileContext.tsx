import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

export type ProfileMode = 'player' | 'organizer' | 'venue_owner';

interface UnifiedProfile {
  // Core Identity (always the same)
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  
  // Unified Reputation System
  reputation: {
    overall_rating: number;
    total_reviews: number;
    player_rating: number;
    organizer_rating: number;
    venue_rating: number;
    badges: string[];
  };
  
  // Mode-Specific Data
  player_profile: {
    gaming_stats: {
      tournaments_played: number;
      tournaments_won: number;
      teams_created: number;
      teams_joined: number;
      total_earnings: number;
    };
    preferences: {
      favorite_games: string[];
      skill_level: string;
      preferred_team_size: number;
    };
    achievements: string[];
  };
  
  organizer_profile: {
    company_name: string;
    company_logo?: string;
    business_type: string;
    website?: string;
    business_stats: {
      tournaments_created: number;
      total_participants: number;
      total_revenue: number;
      active_tournaments: number;
    };
    verification_status: 'pending' | 'verified' | 'rejected';
    business_description?: string;
  };
  
  venue_profile: {
    venue_name: string;
    venue_logo?: string;
    venue_type: string;
    location: string;
    venue_stats: {
      venues_listed: number;
      tournaments_hosted: number;
      total_capacity: number;
      total_revenue: number;
    };
    verification_status: 'pending' | 'verified' | 'rejected';
    venue_description?: string;
  };
  
  // Unified Communication
  messaging: {
    unread_count: number;
    recent_conversations: any[];
  };
  
  // Unified Notifications
  notifications: {
    unread_count: number;
    recent_notifications: any[];
  };
  
  // Financial Overview
  financial: {
    total_earnings: number;
    available_balance: number;
    pending_payouts: number;
    total_withdrawn: number;
    earnings_breakdown: {
      player_earnings: number;
      organizer_revenue: number;
      venue_revenue: number;
    };
  };
}

interface UnifiedProfileContextType {
  profile: UnifiedProfile | null;
  currentMode: ProfileMode;
  isLoading: boolean;
  switchMode: (mode: ProfileMode) => Promise<boolean>;
  canAccessMode: (mode: ProfileMode) => boolean;
  updateProfile: (updates: Partial<UnifiedProfile>) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  
  // Mode-specific getters
  getCurrentDisplayName: () => string;
  getCurrentAvatar: () => string | null;
  getCurrentEarnings: () => number;
  getCurrentStats: () => any;
  
  // Unified features
  getUnifiedRating: () => number;
  getUnifiedBadges: () => string[];
  getUnifiedActivity: () => any[];
}

const UnifiedProfileContext = createContext<UnifiedProfileContextType | undefined>(undefined);

interface UnifiedProfileProviderProps {
  children: ReactNode;
}

export const UnifiedProfileProvider: React.FC<UnifiedProfileProviderProps> = ({ children }) => {
  const { user, profile: authProfile } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UnifiedProfile | null>(null);
  const [currentMode, setCurrentMode] = useState<ProfileMode>('player');
  const [isLoading, setIsLoading] = useState(true);

  // Load unified profile
  const loadUnifiedProfile = async () => {
    if (!user || !authProfile) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Load all profile data in parallel
      const [
        playerData,
        organizerData,
        venueData,
        reputationData,
        financialData
      ] = await Promise.all([
        // Player data
        supabase
          .from('player_stats')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        
        // Organizer data - removed company_profiles
        Promise.resolve({ data: null, error: null }),
        
        // Venue data
        supabase
          .from('venue_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        
        // Reputation data
        supabase
          .from('user_reputation')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        
        // Financial data
        supabase
          .from('user_financials')
          .select('*')
          .eq('user_id', user.id)
          .single()
      ]);

      // Build unified profile
      const unifiedProfile: UnifiedProfile = {
        // Core identity
        id: authProfile.id,
        username: authProfile.username || '',
        full_name: authProfile.full_name || '',
        email: authProfile.email || '',
        avatar_url: authProfile.avatar_url,
        created_at: authProfile.created_at || new Date().toISOString(),
        
        // Reputation
        reputation: {
          overall_rating: reputationData.data?.overall_rating || 0,
          total_reviews: reputationData.data?.total_reviews || 0,
          player_rating: reputationData.data?.player_rating || 0,
          organizer_rating: reputationData.data?.organizer_rating || 0,
          venue_rating: reputationData.data?.venue_rating || 0,
          badges: reputationData.data?.badges || []
        },
        
        // Player profile
        player_profile: {
          gaming_stats: {
            tournaments_played: playerData.data?.tournaments_played || 0,
            tournaments_won: playerData.data?.tournaments_won || 0,
            teams_created: playerData.data?.teams_created || 0,
            teams_joined: playerData.data?.teams_joined || 0,
            total_earnings: playerData.data?.total_earnings || 0
          },
          preferences: {
            favorite_games: playerData.data?.favorite_games || [],
            skill_level: playerData.data?.skill_level || 'beginner',
            preferred_team_size: playerData.data?.preferred_team_size || 5
          },
          achievements: playerData.data?.achievements || []
        },
        
        // Organizer profile
        organizer_profile: {
          company_name: organizerData.data?.company_name || '',
          company_logo: organizerData.data?.company_logo,
          business_type: organizerData.data?.business_type || '',
          website: organizerData.data?.website,
          business_stats: {
            tournaments_created: organizerData.data?.tournaments_created || 0,
            total_participants: organizerData.data?.total_participants || 0,
            total_revenue: organizerData.data?.total_revenue || 0,
            active_tournaments: organizerData.data?.active_tournaments || 0
          },
          verification_status: organizerData.data?.is_verified ? 'verified' : 'pending',
          business_description: organizerData.data?.business_description
        },
        
        // Venue profile
        venue_profile: {
          venue_name: venueData.data?.venue_name || '',
          venue_logo: venueData.data?.venue_logo,
          venue_type: venueData.data?.venue_type || '',
          location: venueData.data?.location || '',
          venue_stats: {
            venues_listed: venueData.data?.venues_listed || 0,
            tournaments_hosted: venueData.data?.tournaments_hosted || 0,
            total_capacity: venueData.data?.total_capacity || 0,
            total_revenue: venueData.data?.total_revenue || 0
          },
          verification_status: venueData.data?.is_verified ? 'verified' : 'pending',
          venue_description: venueData.data?.venue_description
        },
        
        // Unified features
        messaging: {
          unread_count: 0,
          recent_conversations: []
        },
        
        notifications: {
          unread_count: 0,
          recent_notifications: []
        },
        
        financial: {
          total_earnings: financialData.data?.total_earnings || 0,
          available_balance: financialData.data?.available_balance || 0,
          pending_payouts: financialData.data?.pending_payouts || 0,
          total_withdrawn: financialData.data?.total_withdrawn || 0,
          earnings_breakdown: {
            player_earnings: financialData.data?.player_earnings || 0,
            organizer_revenue: financialData.data?.organizer_revenue || 0,
            venue_revenue: financialData.data?.venue_revenue || 0
          }
        }
      };

      setProfile(unifiedProfile);

      // Load current mode from localStorage
      const savedMode = localStorage.getItem('profileMode') as ProfileMode;
      if (savedMode && ['player', 'organizer', 'venue_owner'].includes(savedMode)) {
        setCurrentMode(savedMode);
      }

    } catch (error) {
      console.error('Error loading unified profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch profile mode
  const switchMode = async (mode: ProfileMode): Promise<boolean> => {
    if (!profile) return false;

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
      localStorage.setItem('profileMode', mode);
      
      toast({
        title: 'Mode Switched',
        description: `Switched to ${mode} mode`,
        variant: 'default',
      });
      return true;
    } catch (error) {
      console.error('Error switching mode:', error);
      return false;
    }
  };

  // Check if user can access a specific mode
  const canAccessMode = (mode: ProfileMode): boolean => {
    if (!profile) return false;
    
    switch (mode) {
      case 'player':
        return true; // Everyone can be a player
      case 'organizer':
        return authProfile?.role === 'admin' || profile.organizer_profile.verification_status === 'verified';
      case 'venue_owner':
        return authProfile?.role === 'admin' || profile.venue_profile.verification_status === 'verified';
      default:
        return false;
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<UnifiedProfile>): Promise<boolean> => {
    if (!profile) return false;

    try {
      // Update the profile state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      // This would involve updating the relevant tables based on what changed
      
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  // Refresh profile data
  const refreshProfile = async (): Promise<void> => {
    await loadUnifiedProfile();
  };

  // Mode-specific getters
  const getCurrentDisplayName = (): string => {
    if (!profile) return 'User';
    
    switch (currentMode) {
      case 'player':
        return profile.full_name || profile.username;
      case 'organizer':
        return profile.organizer_profile.company_name || 'Organizer';
      case 'venue_owner':
        return profile.venue_profile.venue_name || 'Venue Owner';
      default:
        return profile.full_name || profile.username;
    }
  };

  const getCurrentAvatar = (): string | null => {
    if (!profile) return null;
    
    switch (currentMode) {
      case 'player':
        return profile.avatar_url;
      case 'organizer':
        return profile.organizer_profile.company_logo;
      case 'venue_owner':
        return profile.venue_profile.venue_logo;
      default:
        return profile.avatar_url;
    }
  };

  const getCurrentEarnings = (): number => {
    if (!profile) return 0;
    
    switch (currentMode) {
      case 'player':
        return profile.player_profile.gaming_stats.total_earnings;
      case 'organizer':
        return profile.organizer_profile.business_stats.total_revenue;
      case 'venue_owner':
        return profile.venue_profile.venue_stats.total_revenue;
      default:
        return 0;
    }
  };

  const getCurrentStats = (): any => {
    if (!profile) return {};
    
    switch (currentMode) {
      case 'player':
        return profile.player_profile.gaming_stats;
      case 'organizer':
        return profile.organizer_profile.business_stats;
      case 'venue_owner':
        return profile.venue_profile.venue_stats;
      default:
        return {};
    }
  };

  // Unified features
  const getUnifiedRating = (): number => {
    return profile?.reputation.overall_rating || 0;
  };

  const getUnifiedBadges = (): string[] => {
    return profile?.reputation.badges || [];
  };

  const getUnifiedActivity = (): any[] => {
    return [];
  };

  useEffect(() => {
    loadUnifiedProfile();
  }, [user, authProfile]);

  const value: UnifiedProfileContextType = {
    profile,
    currentMode,
    isLoading,
    switchMode,
    canAccessMode,
    updateProfile,
    refreshProfile,
    getCurrentDisplayName,
    getCurrentAvatar,
    getCurrentEarnings,
    getCurrentStats,
    getUnifiedRating,
    getUnifiedBadges,
    getUnifiedActivity,
  };

  return (
    <UnifiedProfileContext.Provider value={value}>
      {children}
    </UnifiedProfileContext.Provider>
  );
};

export const useUnifiedProfile = (): UnifiedProfileContextType => {
  const context = useContext(UnifiedProfileContext);
  if (context === undefined) {
    throw new Error('useUnifiedProfile must be used within a UnifiedProfileProvider');
  }
  return context;
};
