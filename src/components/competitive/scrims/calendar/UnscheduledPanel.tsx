/**
 * UnscheduledPanel
 *
 * Accepted matches that still need a time. They are the calendar's to-do list:
 * until a time is agreed in the room they have no day to sit on.
 */

import { Link } from 'react-router-dom';
import type { CalendarSession } from '@/services/scrimCalendar';

export function UnscheduledPanel({ matches }: { matches: CalendarSession[] }) {
  return (
    <aside aria-labelledby="needs-time-title" className="space-y-3 xl:sticky xl:top-6">
      <h2 id="needs-time-title" className="flex items-center gap-2 font-heading text-[16px] font-semibold text-white">
        Needs a time
        {matches.length > 0 && (
          <span className="rounded-full bg-white/[0.08] px-2 py-0.5 font-sans text-[11px] font-medium tabular-nums text-zinc-300">{matches.length}</span>
        )}
      </h2>
      {matches.length === 0 ? (
        <p className="rounded-xl border border-white/[0.08] px-4 py-3 text-[13px] text-zinc-400">
          Every accepted scrim has a time.
        </p>
      ) : (
        <ul className="space-y-2">
          {matches.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-white">vs {m.opponentName ?? 'Opponent'}</p>
                <p className="text-[12px] text-zinc-400">No time agreed yet</p>
              </div>
              <Link
                to={`/competitive/scrims/sessions/${m.id}`}
                className="inline-flex h-9 shrink-0 items-center rounded-lg bg-white px-3.5 text-[13px] font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
              >
                Pick a time
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
