/**
 * ScrimHistory
 *
 * Finished and cancelled scrims, newest first, with search. Collapsed by
 * default when there is an agenda to focus on.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { filterHistory, historyResult } from '@/services/scrimAgenda';
import { formatRoomTime } from '@/services/scrimRoomView';
import type { ScrimSession } from '@/types/competitive';

const PAGE = 10;

interface ScrimHistoryProps {
  sessions: ScrimSession[];
  teamId: string;
  /** Start expanded (used when there is no active agenda). */
  defaultOpen: boolean;
}

export function ScrimHistory({ sessions, teamId, defaultOpen }: ScrimHistoryProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  if (sessions.length === 0) return null;

  const matches = filterHistory(sessions, query);
  const visible = matches.slice(0, shown);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
          History <span className="ml-1 tabular-nums text-white/70">{sessions.length}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 text-white/40 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search past scrims"
              placeholder="Search by team or game"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }}
              className="h-10 w-full border border-white/10 bg-black/30 pl-9 pr-3 text-[13px] text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            />
          </div>

          {visible.length === 0 ? (
            <p className="text-[13px] text-white/45">No past scrims match your search.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06] border border-white/[0.08]">
              {visible.map((s) => {
                const mine = s.team1Id === teamId;
                const opponent = (mine ? s.team2Name : s.team1Name) ?? 'Opponent';
                const outcome = s.status === 'completed' ? historyResult(s, teamId) : null;
                return (
                  <li key={s.id}>
                    <Link
                      to={`/competitive/scrims/sessions/${s.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[10px] font-bold',
                          outcome?.result === 'W' ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-300' : 'border-white/10 text-zinc-500',
                        )}
                        aria-label={outcome ? { W: 'Win', L: 'Loss', D: 'Draw' }[outcome.result] : 'Cancelled'}
                      >
                        {outcome ? outcome.result : '–'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14px] text-white/85">vs {opponent}</span>
                      {outcome && <span className="font-mono text-[13px] tabular-nums text-white/70">{outcome.score}</span>}
                      <span className="hidden text-[12px] tabular-nums text-zinc-500 sm:inline">{formatRoomTime(s.scheduledAt)}</span>
                      {s.status === 'cancelled' && <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">Cancelled</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {matches.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="border border-white/[0.14] px-4 py-2 text-[13px] text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Show {Math.min(PAGE, matches.length - shown)} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
