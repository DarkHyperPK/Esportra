import React from 'react';
import { BarChart2 } from 'lucide-react';
import type { UserStatsDto } from '@/types/profile';
import { StatTilesRow, type StatTile } from '@/components/profile/stats/StatTilesRow';

interface StatsTabProps {
  stats: UserStatsDto;
}

/**
 * StatsTab: standalone stat tiles with empty state.
 * Shows empty state if all stats are zero.
 */
export function StatsTab({ stats }: StatsTabProps): React.JSX.Element {
  const s = stats.statistics;

  const allZero =
    !s ||
    (s.tournaments_entered === 0 &&
      s.tournaments_won === 0 &&
      s.best_placement === null &&
      s.total_prize_cents === 0 &&
      s.games_played === 0);

  if (allZero) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 24px',
          gap: 12,
          textAlign: 'center',
        }}
      >
        <BarChart2 size={32} color="rgba(255,255,255,0.2)" />
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', margin: 0, fontFamily: 'Inter, sans-serif' }}>
          No stats recorded yet
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0, fontFamily: 'Inter, sans-serif' }}>
          Stats accumulate as you compete.
        </p>
      </div>
    );
  }

  const tiles: StatTile[] = [
    { value: s?.tournaments_entered ?? 0, label: 'Tournaments Entered', format: 'integer' },
    { value: s?.tournaments_won ?? 0, label: 'Wins', format: 'integer' },
    { value: s?.best_placement ?? 0, label: 'Best Placement', format: 'ordinal' },
    { value: s?.total_prize_cents ? Math.round(s.total_prize_cents / 100) : 0, label: 'Total Prize', format: 'currency' },
    { value: s?.games_played ?? 0, label: 'Games Played', format: 'integer' },
  ];

  return <StatTilesRow tiles={tiles} />;
}
