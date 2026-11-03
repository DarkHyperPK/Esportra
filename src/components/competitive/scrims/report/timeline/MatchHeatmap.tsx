import { useState } from 'react';
import { HeatmapCanvas } from '@/components/competitive/scrims/data/reports/HeatmapCanvas';
import { cn } from '@/lib/utils';
import type { MatchTimeline } from '@/schemas/scrimTimeline';
import { HEAT_KINDS, heatSummary, type HeatKind, type MapTransform } from '@/services/scrimInsights/heatmap';
import { matchHeatPoints } from '@/services/scrimInsights/timeline';

const SIDES = [{ id: null, label: 'Both' }, { id: 'attack', label: 'Attack' }, { id: 'defense', label: 'Defense' }] as const;

/** This one map's heatmap, from the same data as the timeline. */
export function MatchHeatmap({ timeline, art, transform, map }: { timeline: MatchTimeline; art: string; transform: MapTransform | undefined; map: string | null }) {
  const [kind, setKind] = useState<HeatKind>('kills');
  const [side, setSide] = useState<string | null>(null);
  const points = matchHeatPoints(timeline, kind, side);
  const chip = (active: boolean) => cn('h-8 border px-2.5 text-[11px] font-bold uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40', active ? 'border-white/60 bg-white/10 text-white' : 'border-white/[0.12] text-zinc-400 hover:text-white');
  return (
    <div className="space-y-2">
      <div role="group" aria-label="Heatmap shows" className="flex flex-wrap gap-1.5">
        {HEAT_KINDS.map((k) => <button key={k.id} type="button" title={k.help} aria-pressed={k.id === kind} onClick={() => setKind(k.id)} className={chip(k.id === kind)}>{k.label}</button>)}
      </div>
      <div role="group" aria-label="Heatmap side" className="flex gap-1.5">
        {SIDES.map((s) => <button key={s.label} type="button" aria-pressed={s.id === side} onClick={() => setSide(s.id)} className={chip(s.id === side)}>{s.label}</button>)}
      </div>
      <p className="text-[12px] text-zinc-300" role="status">{heatSummary(kind, points.length, 1, map, side)}</p>
      <HeatmapCanvas art={art} transform={transform} points={points} label={`Heatmap of this map: ${kind}`} />
    </div>
  );
}
