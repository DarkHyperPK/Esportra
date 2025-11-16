import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface UserStatistics {
  id: string;
  user_id: string;
  tournaments_played: number;
  tournaments_won: number;
  tournaments_organized: number;
  teams_created: number;
  teams_joined: number;
  venue_bookings: number;
  total_earnings: number;
  total_spent: number;
  favorite_games: string[];
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'tournament' | 'team' | 'venue' | 'social' | 'milestone';
  icon_url?: string;
  points: number;
  requirements: any;
  is_active: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  progress: any;
  achievement: Achievement;
}

export const useUserStats = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user statistics
  const fetchStatistics = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, [user]);

  // Fetch all achievements
  const fetchAchievements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('points', { ascending: true });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  }, []);

  // Fetch user achievements
  const fetchUserAchievements = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setUserAchievements(data || []);
    } catch (error) {
      console.error('Error fetching user achievements:', error);
    }
  }, [user]);

  // Check and award achievements
  const checkAchievements = useCallback(async () => {
    if (!user || !statistics) return;

    try {
      // Check each achievement
      for (const achievement of achievements) {
        const hasAchievement = userAchievements.some(
          ua => ua.achievement_id === achievement.id
        );

        if (hasAchievement) continue;

        let shouldAward = false;

        // Check achievement requirements
        switch (achievement.name) {
          case 'First Tournament':
            shouldAward = statistics.tournaments_played >= 1;
            break;
          case 'Tournament Winner':
            shouldAward = statistics.tournaments_won >= 1;
            break;
          case 'Team Creator':
            shouldAward = statistics.teams_created >= 1;
            break;
          case 'Venue Explorer':
            shouldAward = statistics.venue_bookings >= 1;
            break;
          case 'Tournament Organizer':
            shouldAward = statistics.tournaments_organized >= 1;
            break;
          case 'Social Butterfly':
            shouldAward = statistics.teams_joined >= 5;
            break;
          case 'Gaming Veteran':
            shouldAward = statistics.tournaments_played >= 10;
            break;
          case 'Champion':
            shouldAward = statistics.tournaments_won >= 5;
            break;
        }

        if (shouldAward) {
          await awardAchievement(achievement.id);
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }, [user, statistics, achievements, userAchievements]);

  // Award achievement
  const awardAchievement = async (achievementId: string) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievementId,
        })
        .select(`
          *,
          achievement:achievements(*)
        `)
        .single();

      if (error) throw error;

      // Show achievement notification
      toast({
        title: 'Achievement Unlocked!',
        description: `You earned the "${data.achievement.name}" achievement!`,
        variant: 'default',
      });

      // Refresh user achievements
      await fetchUserAchievements();

      return true;
    } catch (error: any) {
      if (error.code === '23505') {
        // Achievement already exists, ignore
        return false;
      }
      console.error('Error awarding achievement:', error);
      return false;
    }
  };

  // Update skill level based on statistics
  const updateSkillLevel = useCallback(async () => {
    if (!user || !statistics) return;

    let newSkillLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional' = 'beginner';

    if (statistics.tournaments_won >= 10 || statistics.tournaments_played >= 50) {
      newSkillLevel = 'professional';
    } else if (statistics.tournaments_won >= 5 || statistics.tournaments_played >= 20) {
      newSkillLevel = 'advanced';
    } else if (statistics.tournaments_won >= 2 || statistics.tournaments_played >= 10) {
      newSkillLevel = 'intermediate';
    }

    if (newSkillLevel !== statistics.skill_level) {
      try {
        const { error } = await supabase
          .from('user_statistics')
          .update({ skill_level: newSkillLevel })
          .eq('user_id', user.id);

        if (error) throw error;

        setStatistics(prev => prev ? { ...prev, skill_level: newSkillLevel } : null);
      } catch (error) {
        console.error('Error updating skill level:', error);
      }
    }
  }, [user, statistics]);

  // Get achievement progress
  const getAchievementProgress = (achievement: Achievement) => {
    if (!statistics) return 0;

    switch (achievement.name) {
      case 'First Tournament':
        return Math.min(100, (statistics.tournaments_played / 1) * 100);
      case 'Tournament Winner':
        return Math.min(100, (statistics.tournaments_won / 1) * 100);
      case 'Team Creator':
        return Math.min(100, (statistics.teams_created / 1) * 100);
      case 'Venue Explorer':
        return Math.min(100, (statistics.venue_bookings / 1) * 100);
      case 'Tournament Organizer':
        return Math.min(100, (statistics.tournaments_organized / 1) * 100);
      case 'Social Butterfly':
        return Math.min(100, (statistics.teams_joined / 5) * 100);
      case 'Gaming Veteran':
        return Math.min(100, (statistics.tournaments_played / 10) * 100);
      case 'Champion':
        return Math.min(100, (statistics.tournaments_won / 5) * 100);
      default:
        return 0;
    }
  };

  // Get user's total points
  const getTotalPoints = () => {
    return userAchievements.reduce((total, ua) => total + ua.achievement.points, 0);
  };

  // Get user's rank
  const getUserRank = () => {
    if (!statistics) return 'Beginner';
    
    const totalPoints = getTotalPoints();
    
    if (totalPoints >= 500) return 'Legend';
    if (totalPoints >= 300) return 'Master';
    if (totalPoints >= 200) return 'Expert';
    if (totalPoints >= 100) return 'Advanced';
    if (totalPoints >= 50) return 'Intermediate';
    return 'Beginner';
  };

  // Initialize data
  useEffect(() => {
    if (user) {
      Promise.all([
        fetchStatistics(),
        fetchAchievements(),
        fetchUserAchievements(),
      ]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, fetchStatistics, fetchAchievements, fetchUserAchievements]);

  // Check achievements when statistics change
  useEffect(() => {
    if (statistics && achievements.length > 0) {
      checkAchievements();
      updateSkillLevel();
    }
  }, [statistics, achievements, checkAchievements, updateSkillLevel]);

  return {
    statistics,
    achievements,
    userAchievements,
    loading,
    
    // Computed values
    totalPoints: getTotalPoints(),
    userRank: getUserRank(),
    
    // Functions
    fetchStatistics,
    fetchAchievements,
    fetchUserAchievements,
    awardAchievement,
    getAchievementProgress,
  };
};
