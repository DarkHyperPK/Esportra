import { cn } from '@/lib/utils';
import type { TimelineRound } from '@/schemas/scrimTimeline';

/** Every round of the map as one button, coloured by who won it, so any round is one click away. */
export function RoundStrip({ rounds, value, onChange }: { rounds: TimelineRound[]; value: number; onChange: (n: number) => void }) {
  return (
    <div role="group" aria-label="Choose a round" className="flex flex-wrap gap-1">
      {rounds.map((r) => (
        <button key={r.num} type="button" aria-pressed={r.num === value} onClick={() => onChange(r.num)}
          title={`Round ${r.num}${r.won == null ? '' : r.won ? ', won' : ', lost'}${r.myRole ? `, ${r.myRole === 'attack' ? 'attacking' : 'defending'}` : ''}`}
          className={cn('h-8 min-w-8 border px-1.5 text-[12px] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            r.won === true ? 'border-emerald-400/40 text-emerald-200' : r.won === false ? 'border-rose-400/40 text-rose-200' : 'border-white/10 text-zinc-400',
            r.num === value && 'bg-white/15 text-white ring-1 ring-white/50')}>
          {r.num}
        </button>
      ))}
    </div>
  );
}
