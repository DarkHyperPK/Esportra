import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Award, Trophy } from "lucide-react";
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AchievementLike = {
  id?: string;
  achievement_id?: string;
  name?: string;
  title?: string;
  description?: string | null;
  category?: string | null;
  points?: number | null;
  progress?: number | null;
  earned_at?: string | null;
  date?: string | null;
};

type ProfileStatsResponse = {
  achievements?: AchievementLike[];
};

type PlayerAchievementsProps = {
  profileId?: string;
  profileAchievements?: unknown;
};

const normalizeAchievements = (value: unknown): AchievementLike[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean) as AchievementLike[];
  if (typeof value === 'object') {
    const objectValue = value as { items?: unknown; achievements?: unknown; unlocked?: unknown };
    if (Array.isArray(objectValue.achievements)) return objectValue.achievements as AchievementLike[];
    if (Array.isArray(objectValue.items)) return objectValue.items as AchievementLike[];
    if (Array.isArray(objectValue.unlocked)) return objectValue.unlocked as AchievementLike[];
  }
  return [];
};

const formatEarnedDate = (value?: string | null) => {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const PlayerAchievements = ({ profileId, profileAchievements }: PlayerAchievementsProps) => {
  const profileAchievementRows = useMemo(() => normalizeAchievements(profileAchievements), [profileAchievements]);

  const statsQuery = useQuery({
    queryKey: ['profile', profileId, 'stats'],
    queryFn: () => apiClient.get<ProfileStatsResponse>(`/api/profiles/${profileId}/stats`),
    enabled: Boolean(profileId),
    staleTime: 5 * 60_000,
  });

  const achievements = useMemo(() => {
    const statsAchievements = normalizeAchievements(statsQuery.data?.achievements);
    return statsAchievements.length > 0 ? statsAchievements : profileAchievementRows;
  }, [profileAchievementRows, statsQuery.data?.achievements]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Achievements</h2>
      </div>

      {statsQuery.isLoading && profileAchievementRows.length === 0 && (
        <Card className="bg-[#0a0a0c] border-white/10">
          <CardContent className="space-y-4 p-6">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-20 animate-pulse border border-white/10 bg-white/[0.03]" />
            ))}
          </CardContent>
        </Card>
      )}

      {statsQuery.isError && profileAchievementRows.length === 0 && (
        <Card className="bg-[#0a0a0c] border-red-500/20">
          <CardContent className="flex items-start gap-4 p-6">
            <AlertCircle className="mt-1 h-5 w-5 text-red-400" />
            <div>
              <h3 className="font-bold text-white">Could not load achievements</h3>
              <p className="mt-1 text-sm text-gray-400">
                Achievement data could not be loaded. This is not being shown as an empty profile.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!statsQuery.isLoading && !statsQuery.isError && achievements.length === 0 && (
        <Card className="bg-[#0a0a0c] border-white/10">
          <CardHeader>
            <CardTitle>Gaming Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 mb-6 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trophy className="h-10 w-10 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Achievements Yet</h3>
              <p className="text-gray-400 max-w-md">
                Compete in tournaments, win matches, and complete milestones to earn achievements.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {achievements.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {achievements.map((achievement, index) => (
            <AchievementCard key={achievement.id ?? achievement.achievement_id ?? `${achievement.name}-${index}`} achievement={achievement} />
          ))}
        </div>
      )}
    </div>
  );
};

const AchievementCard = ({ achievement }: { achievement: AchievementLike }) => {
  const title = achievement.name ?? achievement.title ?? 'Achievement';
  const earnedDate = formatEarnedDate(achievement.earned_at ?? achievement.date);

  return (
    <Card className="bg-[#0a0a0c] border-white/10">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-rose-500/20 bg-rose-500/10">
            <Award className="h-6 w-6 text-rose-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-white">{title}</h3>
              {achievement.category && (
                <Badge className="border border-white/10 bg-white/[0.03] text-zinc-300">{achievement.category}</Badge>
              )}
            </div>
            {achievement.description && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{achievement.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
              {achievement.points != null && <span>{achievement.points} points</span>}
              {achievement.progress != null && <span>{achievement.progress}% progress</span>}
              {earnedDate && <span>Earned {earnedDate}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerAchievements;
