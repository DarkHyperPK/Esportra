import { EYEBROW_CLASS } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import type { TeamRatings } from '@/schemas/scrimReport';
import type { TeamReportBody } from '@/types/scrimReport';
import { useMapArt } from '../maps/useMapArt';

const SHOWN = 10;

/** Each recent map as one row over its splash art, newest first: result, opponent, score and that map's team rating against the average. */
export function MapRatingBars({ series, byMap }: { series: TeamReportBody['series']; byMap: TeamRatings['byMap'] }) {
  const art = useMapArt();
  const rows = series.slice(-SHOWN).reverse().map((s) => ({ s, value: byMap.find((m) => m.index === s.index)?.value ?? null }));
  const rated = rows.filter((r) => r.value != null);
  if (rated.length === 0) return null;
  const avg = rated.reduce((n, r) => n + (r.value ?? 0), 0) / rated.length;
  return (
    <section aria-label="Map by map" className="overflow-hidden rounded-xl border border-white/[0.05] bg-[#0a0a0c]">
      <div className="flex items-baseline justify-between px-4 pb-2 pt-4">
        <h3 className={EYEBROW_CLASS}>Map by map</h3>
        <p className="font-mono text-[11px] tabular-nums text-white/50">Average <span className="text-white">{Math.round(avg)}</span></p>
      </div>
      <ol className="divide-y divide-white/[0.04]">
        {rows.map(({ s, value }) => {
          const splash = s.map ? art(s.map) : null;
          const won = s.result === 'win';
          const lost = s.result === 'loss';
          return (
            <li key={s.index} className="relative overflow-hidden"
              aria-label={`${s.map ?? 'Map'} against ${s.opponent}: ${won ? 'won' : lost ? 'lost' : 'drew'} ${s.roundsWon}–${s.roundsLost}, rating ${value == null ? 'none' : Math.round(value)}`}>
              {splash && <img src={splash} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] via-[#0a0a0c]/80 to-[#0a0a0c]/40" />
              <div className="relative grid grid-cols-[1.25rem_minmax(0,9rem)_3.5rem_minmax(0,1fr)_2.25rem] items-center gap-3 px-4 py-2.5">
                <span className={cn('font-mono text-[11px] font-bold', won ? 'text-emerald-300' : lost ? 'text-rose-400' : 'text-white/50')}>{won ? 'W' : lost ? 'L' : 'D'}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-white">{s.map ?? 'Map'}</span>
                  <span className="block truncate text-[11px] text-white/45">vs {s.opponent}</span>
                </span>
                <span className="font-mono text-[12px] tabular-nums text-white/80">{s.roundsWon}–{s.roundsLost}</span>
                <span className="relative h-1.5 rounded-full bg-white/[0.08]" aria-hidden="true">
                  <span className={cn('absolute inset-y-0 left-0 rounded-full', won ? 'bg-white/85' : 'bg-white/35')} style={{ width: `${value ?? 0}%` }} />
                  <span className="absolute -inset-y-1 w-px bg-rose-400/80" style={{ left: `${avg}%` }} />
                </span>
                <span className="text-right font-heading text-[16px] font-bold tabular-nums text-white">{value == null ? '—' : Math.round(value)}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
