import { cn } from '@/lib/utils';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import type { TeamRatings } from '@/schemas/scrimReport';
import type { TeamReportBody } from '@/types/scrimReport';

const SHOWN = 12;

/** The team rating of each recent map, oldest on the left, with the result and the average across them. */
export function MapRatingBars({ series, byMap }: { series: TeamReportBody['series']; byMap: TeamRatings['byMap'] }) {
  const rows = series.slice(-SHOWN).map((s) => ({ s, value: byMap.find((m) => m.index === s.index)?.value ?? null }));
  const rated = rows.filter((r) => r.value != null);
  if (rated.length === 0) return null;
  const avg = rated.reduce((n, r) => n + (r.value ?? 0), 0) / rated.length;
  return (
    <section aria-label="Map by map" className="border border-white/[0.06] bg-[#0a0a0c] p-5">
      <div className="flex items-baseline justify-between">
        <h3 className={EYEBROW_CLASS}>Map by map</h3>
        <p className="font-mono text-[11px] tabular-nums text-white/50">Average <span className="text-white">{Math.round(avg)}</span></p>
      </div>
      <div className="relative mt-6 h-48">
        <span aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-white/25" style={{ bottom: `${avg}%` }} />
        <ol className="absolute inset-0 flex items-end gap-2">
          {rows.map(({ s, value }) => {
            const won = s.result === 'win';
            return (
              <li key={s.index} className="flex h-full min-w-0 flex-1 flex-col justify-end" aria-label={`${s.map ?? 'Map'} against ${s.opponent}: ${won ? 'won' : s.result === 'loss' ? 'lost' : 'drew'} ${s.roundsWon}–${s.roundsLost}, rating ${value == null ? 'none' : Math.round(value)}`}>
                <span className={cn('mb-1 text-center font-mono text-[10px] font-bold', won ? 'text-emerald-300' : s.result === 'loss' ? 'text-rose-400' : 'text-white/50')}>{won ? 'W' : s.result === 'loss' ? 'L' : 'D'}</span>
                <span className={cn('relative w-full', won ? 'bg-white/80' : 'bg-white/25')} style={{ height: `${Math.max(4, value ?? 0)}%` }}>
                  <span className="absolute inset-x-0 top-1 text-center font-mono text-[10px] font-bold tabular-nums text-black/80">{value == null ? '' : Math.round(value)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <ol className="mt-2 flex gap-2" aria-hidden="true">
        {rows.map(({ s }) => <li key={s.index} className="min-w-0 flex-1 truncate text-center font-mono text-[10px] text-white/45" title={`${s.map ?? 'Map'} vs ${s.opponent}`}>{s.map ?? '—'}</li>)}
      </ol>
    </section>
  );
}
