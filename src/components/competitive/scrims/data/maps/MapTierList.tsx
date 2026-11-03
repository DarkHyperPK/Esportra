import { EYEBROW_CLASS } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import { formatPct } from '@/services/scrimData/format';
import { MIN_MAPS_TO_RANK, PRIOR_ROUNDS, TIER_MIN, TIER_ORDER, mapTiers, type MapTier } from '@/services/scrimData/mapTiers';
import type { MapIntel } from '@/types/scrimData';

const BLOCK: Record<MapTier, string> = { S: 'bg-[#f43f5e] text-white', A: 'bg-white/[0.16] text-white', B: 'bg-white/[0.11] text-zinc-200', C: 'bg-white/[0.07] text-zinc-300', D: 'bg-white/[0.04] text-zinc-400' };

const HOW = `Maps ranked by rounds won, with half a map (${PRIOR_ROUNDS} rounds) at 50% added so a short sample cannot top the list. S ${TIER_MIN.S}%+, A ${TIER_MIN.A}%+, B ${TIER_MIN.B}%+, C ${TIER_MIN.C}%+, D below. A map needs ${MIN_MAPS_TO_RANK}+ maps to be placed.`;

function Card({ m, rating, art }: { m: MapIntel; rating?: number; art: string | null }) {
  return (
    <li className="relative h-16 w-40 overflow-hidden border border-white/[0.06] bg-[#0b0b0d]" title={`${m.map}: ${m.wins}–${m.games - m.wins} on maps, ${m.roundsWon}–${m.roundsLost} on rounds`}>
      {art && <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" loading="lazy" />}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="relative flex h-full flex-col justify-center px-3">
        <span className="truncate text-[13px] font-bold text-white">{m.map}</span>
        <span className="text-[11px] tabular-nums text-zinc-300">{m.wins}–{m.games - m.wins} · {rating != null ? formatPct(rating) : `${m.games} map${m.games === 1 ? '' : 's'}`}</span>
      </div>
    </li>
  );
}

/** Maps from S down to D by how the team has done on them. The method is in the heading's tooltip. */
export function MapTierList({ maps, artFor }: { maps: MapIntel[]; artFor: (map: string) => string | null }) {
  const { tiers, unranked } = mapTiers(maps);
  if (maps.length === 0) return null;
  return (
    <section aria-label="Map tier list" className="border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS} title={HOW}>Map tier list</h3>
      <div className="mt-3 divide-y divide-white/[0.06] border border-white/[0.06]">
        {TIER_ORDER.map((t) => (
          <div key={t} className="flex min-h-[4.5rem]">
            <div className={cn('grid w-14 shrink-0 place-items-center font-heading text-[22px] font-black', BLOCK[t])} aria-label={`Tier ${t}`}>{t}</div>
            <ul className="flex flex-1 flex-wrap items-center gap-2 p-2" aria-label={`Tier ${t} maps`}>
              {tiers[t].map((r) => <Card key={r.map.map} m={r.map} rating={r.rating} art={artFor(r.map.map)} />)}
            </ul>
          </div>
        ))}
        {unranked.length > 0 && (
          <div className="flex min-h-[4.5rem]">
            <div className="grid w-14 shrink-0 place-items-center text-center text-[10px] font-black uppercase leading-tight tracking-wide text-zinc-500" aria-label="Not enough maps">Need more</div>
            <ul className="flex flex-1 flex-wrap items-center gap-2 p-2" aria-label="Maps without enough games">
              {unranked.map((m) => <Card key={m.map} m={m} art={artFor(m.map)} />)}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
