import type { ProposalStat } from '@/schemas/proposal';
import { CAPTION, CELL, GRID, NUMBER } from './docStyles';

const COLS: Record<number, string> = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' };

/** Scoreboard tiles: caption above, hero number, optional note. Empty stats are skipped. */
export function StatsGrid({ stats }: { stats: ProposalStat[] }) {
  const shown = stats.filter((s) => s.value.trim());
  if (shown.length === 0) return null;
  return (
    <div className={`${GRID} pd-avoid grid-cols-1 ${COLS[Math.min(shown.length, 3)] ?? 'sm:grid-cols-3'}`}>
      {shown.map((stat, i) => (
        <div key={`${stat.label}-${i}`} className={`${CELL} flex flex-col justify-between gap-6 p-6 md:p-8`}>
          <p className={CAPTION}>{stat.label}</p>
          <p className={`${NUMBER} text-6xl leading-none md:text-7xl`}>{stat.value}</p>
          {stat.note && <p className="-mt-3 text-[13px] text-[color:var(--pd-muted)]">{stat.note}</p>}
        </div>
      ))}
    </div>
  );
}
