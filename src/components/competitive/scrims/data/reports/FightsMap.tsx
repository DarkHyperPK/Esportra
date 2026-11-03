import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Fight } from '@/schemas/scrimFights';
import { GRID, MIN_ZONE_FIGHTS, spacingOf, spacingSentence, zonesOf, type ZoneTone } from '@/services/scrimInsights/fights';
import type { MapTransform } from '@/services/scrimInsights/heatmap';

const TONE: Record<ZoneTone, string> = { good: 'bg-emerald-400', bad: 'bg-rose-500', even: 'bg-zinc-300' };

interface Props { art: string; transform: MapTransform | undefined; fights: Fight[]; map: string | null }

/** The map in eight-by-eight zones: green where you win the fights, red where you lose them, the score in each. Zones with too few fights stay blank. */
export function FightsMap({ art, transform, fights, map }: Props) {
  const zones = useMemo(() => zonesOf(fights, transform), [fights, transform]);
  const spacing = useMemo(() => spacingSentence(spacingOf(fights)), [fights]);
  const won = fights.filter((f) => f.won).length;
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-zinc-300" role="status" title={`Zones with fewer than ${MIN_ZONE_FIGHTS} fights are left blank. A fight is a kill, placed where the victim fell.`}>
        {fights.length === 0 ? `No fights recorded${map ? ` on ${map}` : ''} yet.` : `${fights.length} fights${map ? ` on ${map}` : ''}: you won ${won}, lost ${fights.length - won}.`}
      </p>
      <figure className="relative mx-auto aspect-square w-full max-w-[720px] overflow-hidden border border-white/[0.06] bg-[#0b0b0d]" aria-label={`Fights by area${map ? ` on ${map}` : ''}`}>
        <img src={art} alt="" className="absolute inset-0 h-full w-full object-contain opacity-60" loading="lazy" />
        {zones.map((z) => (
          <div key={`${z.col}:${z.row}`} title={`${z.won} won, ${z.lost} lost`}
            style={{ left: `${(z.col / GRID) * 100}%`, top: `${(z.row / GRID) * 100}%`, width: `${100 / GRID}%`, height: `${100 / GRID}%` }}
            className="absolute grid place-items-center p-px">
            <span className={cn('absolute inset-px', TONE[z.tone])} style={{ opacity: Math.min(0.55, 0.2 + z.fights * 0.05) }} aria-hidden />
            <span className="relative text-[11px] font-bold tabular-nums text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">{`${z.won}–${z.lost}`}</span>
          </div>
        ))}
      </figure>
      {spacing && <p className="text-[13px] text-zinc-200">{spacing}</p>}
    </div>
  );
}
