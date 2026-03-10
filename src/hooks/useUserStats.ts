import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

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

interface StatsResponse {
  statistics: UserStatistics | null;
  achievements: UserAchievement[];
}

export const useUserStats = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user statistics + earned achievements in one call
  const { data: statsData, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ['profile-stats', user?.id],
    queryFn: () => apiClient.get<StatsResponse>(`/api/profiles/${user!.id}/stats`),
    enabled: !!user,
    staleTime: 60_000,
  });

  const statistics = statsData?.statistics ?? null;
  const userAchievements = (statsData?.achievements ?? []) as UserAchievement[];

  // Fetch all available achievements
  const { data: achievements = [], isLoading: achievementsLoading } = useQuery<Achievement[]>({
    queryKey: ['achievements-all'],
    queryFn: () => apiClient.get<Achievement[]>('/api/achievements'),
    staleTime: 300_000,
  });

  // Award achievement mutation
  const awardMutation = useMutation({
    mutationFn: (achievementId: string) =>
      apiClient.post(`/api/profiles/me/achievements/${achievementId}`, {}),
    onSuccess: (data: any) => {
      if (!data.alreadyAwarded) {
        queryClient.invalidateQueries({ queryKey: ['profile-stats', user?.id] });
        const achievement = achievements.find(a => a.id === data.achievement_id);
        if (achievement) {
          toast({
            title: 'Achievement Unlocked!',
            description: `You earned the "${achievement.name}" achievement!`,
          });
        }
      }
    },
  });

  const awardAchievement = async (achievementId: string) => {
    try {
      await awardMutation.mutateAsync(achievementId);
      return true;
    } catch {
      return false;
    }
  };

  // Auto-check and award achievements when statistics change
  useEffect(() => {
    if (!user || !statistics || achievements.length === 0) return;

    const check = async () => {
      for (const achievement of achievements) {
        const hasAchievement = userAchievements.some(
          ua => ua.achievement_id === achievement.id
        );
        if (hasAchievement) continue;

        let shouldAward = false;
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

      // Auto-update skill level
      let newSkillLevel: string = 'beginner';
      if (statistics.tournaments_won >= 10 || statistics.tournaments_played >= 50) {
        newSkillLevel = 'professional';
      } else if (statistics.tournaments_won >= 5 || statistics.tournaments_played >= 20) {
        newSkillLevel = 'advanced';
      } else if (statistics.tournaments_won >= 2 || statistics.tournaments_played >= 10) {
        newSkillLevel = 'intermediate';
      }

      if (newSkillLevel !== statistics.skill_level) {
        try {
          await apiClient.put('/api/profiles/me/skill-level', { skillLevel: newSkillLevel });
          queryClient.invalidateQueries({ queryKey: ['profile-stats', user?.id] });
        } catch {
          // Non-critical, silently ignore
        }
      }
    };

    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statistics, achievements.length]);

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

  const getTotalPoints = () => {
    return userAchievements.reduce((total, ua) => total + (ua.achievement?.points ?? 0), 0);
  };

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

  return {
    statistics,
    achievements,
    userAchievements,
    loading: statsLoading || achievementsLoading,

    totalPoints: getTotalPoints(),
    userRank: getUserRank(),

    fetchStatistics: () => queryClient.invalidateQueries({ queryKey: ['profile-stats', user?.id] }),
    fetchAchievements: () => queryClient.invalidateQueries({ queryKey: ['achievements-all'] }),
    fetchUserAchievements: () => queryClient.invalidateQueries({ queryKey: ['profile-stats', user?.id] }),
    awardAchievement,
    getAchievementProgress,
  };
};
