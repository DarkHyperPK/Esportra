/**
 * RecentResults
 *
 * The team's last few games, so a record is backed by names and scores.
 * Renders nothing when history is private, empty or failed to load.
 */

import { EYEBROW_CLASS } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import type { ScrimHistoryEntry, ScrimHistoryResult } from '@/types/competitive';

const LETTER: Record<ScrimHistoryResult, string> = { win: 'W', loss: 'L', draw: 'D' };
const WORD: Record<ScrimHistoryResult, string> = { win: 'Win', loss: 'Loss', draw: 'Draw' };

export function RecentResults({ entries }: { entries: ScrimHistoryEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="space-y-2" aria-labelledby="recent-results-title">
      <h3 id="recent-results-title" className={EYEBROW_CLASS}>Recent results</h3>
      <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
        {entries.map((e) => (
          <li key={e.sessionId} className="flex items-center gap-3 px-3.5 py-2.5">
            <span
              aria-label={WORD[e.result]}
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-[10px] font-bold',
                e.result === 'win' ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-300' : 'border-white/10 text-zinc-500',
              )}
            >
              {LETTER[e.result]}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-white/85">vs {e.opponentTeamName ?? 'Unknown team'}</span>
            {e.mapName && <span className="hidden truncate text-[11px] text-zinc-500 sm:inline">{e.mapName}</span>}
            <span className="font-mono text-[13px] tabular-nums text-white/75">{e.myScore} – {e.opponentScore}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
