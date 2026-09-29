import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StandingsRow } from '@/types/standings';

export function Diff({ value }: { value: number }) {
  return (
    <span className={cn(value > 0 ? 'text-emerald-300' : value < 0 ? 'text-zinc-400' : 'text-zinc-600')}>
      {value > 0 ? `+${value}` : value}
    </span>
  );
}

/** Form guide: filled square = win, outlined = loss, dot = draw. Never red for the loser. */
export function FormGuide({ results }: { results: string[] | null }) {
  if (!results || results.length === 0) return <span className="text-zinc-600">–</span>;
  const label = results.map((r) => (r === 'win' ? 'Win' : r === 'loss' ? 'Loss' : 'Draw')).join(', ');
  return (
    <span className="inline-flex items-center gap-1" aria-label={label} title={label}>
      {results.map((r, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            'h-2.5 w-2.5',
            r === 'win' ? 'bg-white' : r === 'loss' ? 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]' : 'mx-[3px] h-1 w-1 bg-zinc-600',
          )}
        />
      ))}
    </span>
  );
}

export function RankCell({ row, isFinal }: { row: StandingsRow; isFinal: boolean }) {
  const podium = isFinal && row.rank <= 3;
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn('font-heading font-black tabular-nums', podium ? 'text-lg text-white' : 'text-sm text-zinc-300')}>
        {row.rank}
        {row.is_tied && <span className="ml-0.5 text-xs font-medium text-zinc-500">=</span>}
      </span>
      {row.rank_status === 'provisional' && (
        <Clock className="h-3 w-3 text-zinc-600" aria-label="Provisional rank" />
      )}
    </span>
  );
}

export function TeamCell({ row }: { row: StandingsRow }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate font-medium text-white">{row.team_name}</span>
      {row.is_live && (
        <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-300">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Live{row.live_opponent ? <span className="normal-case tracking-normal text-zinc-400"> vs {row.live_opponent}</span> : null}
        </span>
      )}
    </span>
  );
}
