import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import type { UserStatsDto, AchievementDto } from '@/types/profile';
import { format, parseISO } from 'date-fns';

interface AchievementsTabProps {
  profileId: string;
  accentColor: string;
}

/**
 * AchievementsTab: points badge + earned/locked achievement cards.
 * badge-arrive spring animation (stiffness: 300, damping: 25), stagger 30ms (capped at 10).
 */
export function AchievementsTab({ profileId, accentColor }: AchievementsTabProps): React.JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['profile-stats', profileId],
    queryFn: () => apiClient.get<UserStatsDto>(`/api/profiles/${profileId}/stats`),
    staleTime: 5 * 60 * 1000,
  });

  const reduced = useReducedMotion();
  const achievements = data?.achievements ?? [];
  const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <Loader2 size={24} color="rgba(255,255,255,0.4)" className="animate-spin" />
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '40px 0' }}>
        No achievements yet
      </div>
    );
  }

  return (
    <div>
      {/* Points badge */}
      {totalPoints > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: accentColor,
              }}
            />
            {totalPoints.toLocaleString()} points
          </div>
        </div>
      )}

      {/* Achievement grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
        className="achievements-grid"
      >
        <style>{`
          @media (max-width: 767px) {
            .achievements-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 8px !important;
            }
          }
        `}</style>

        {achievements.map((achievement, i) => (
          <AchievementCard
            key={achievement.achievement_id}
            achievement={achievement}
            accentColor={accentColor}
            index={i}
            reduced={!!reduced}
          />
        ))}
      </div>
    </div>
  );
}

function AchievementCard({
  achievement,
  accentColor,
  index,
  reduced,
}: {
  achievement: AchievementDto;
  accentColor: string;
  index: number;
  reduced: boolean;
}): React.JSX.Element {
  // Stagger cap: items beyond index 9 use delay 0
  const delay = Math.min(index, 9) * 0.03;
  const earnedStr = (() => {
    try { return format(parseISO(achievement.earned_at), 'MMM d, yyyy'); }
    catch { return ''; }
  })();

  return (
    <motion.div
      initial={reduced ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={
        reduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 300, damping: 25, delay }
      }
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 8,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: `rgba(${hexToRgb(accentColor)}, 0.15)`,
          border: `1px solid rgba(${hexToRgb(accentColor)}, 0.3)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {achievement.icon_url ? (
          <img src={achievement.icon_url} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: 20 }}>🏆</span>
        )}
      </div>

      {/* Name */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
        {achievement.name}
      </div>

      {/* Description */}
      {achievement.description && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
          {achievement.description}
        </div>
      )}

      {/* Earned date */}
      {earnedStr && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter, sans-serif' }}>
          {earnedStr}
        </div>
      )}
    </motion.div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '123, 97, 255';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
