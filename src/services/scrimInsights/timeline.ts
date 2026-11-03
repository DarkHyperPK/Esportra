import type { MatchTimeline, TimelineKill, TimelineRound } from '@/schemas/scrimTimeline';
import type { HeatKind } from './heatmap';

/** One thing that happened in a round, in time order, for the lanes and the minimap to point at. */
export type RoundEvent =
  | { id: string; ms: number | null; kind: 'kill'; kill: TimelineKill }
  | { id: string; ms: number | null; kind: 'plant'; round: TimelineRound }
  | { id: string; ms: number | null; kind: 'defuse'; round: TimelineRound };

export function roundEvents(r: TimelineRound): RoundEvent[] {
  const events: RoundEvent[] = r.kills.map((k) => ({ id: `k${k.ordinal}`, ms: k.ms, kind: 'kill', kill: k }));
  if (r.plantSite) events.push({ id: 'plant', ms: r.plantMs, kind: 'plant', round: r });
  if (r.defused) events.push({ id: 'defuse', ms: r.defuseMs, kind: 'defuse', round: r });
  return events.sort((a, b) => (a.ms ?? Number.MAX_SAFE_INTEGER) - (b.ms ?? Number.MAX_SAFE_INTEGER));
}

/** The positions behind a heatmap of this one match, from the same data as the timeline. Opening = the first kill of a round. */
export function matchHeatPoints(t: MatchTimeline, kind: HeatKind, side: string | null): Array<{ x: number; y: number; round: number }> {
  const mine = new Set(t.players.filter((p) => p.mine).map((p) => p.key));
  const out: Array<{ x: number; y: number; round: number }> = [];
  for (const r of t.rounds) {
    if (side && r.myRole !== side) continue;
    const ordered = roundEvents(r).filter((e): e is Extract<RoundEvent, { kind: 'kill' }> => e.kind === 'kill');
    const kills = kind.startsWith('opening') ? ordered.slice(0, 1) : ordered;
    for (const e of kills) {
      const k = e.kill;
      if ((kind === 'kills' || kind === 'opening_kills') && k.killer && mine.has(k.killer)) {
        const at = k.positions.find((p) => p.key === k.killer);
        if (at) out.push({ x: at.x, y: at.y, round: r.num });
      }
      if ((kind === 'deaths' || kind === 'opening_deaths') && mine.has(k.victim) && k.victimX != null && k.victimY != null && !(Math.abs(k.victimX) < 1 && Math.abs(k.victimY) < 1)) {
        out.push({ x: k.victimX, y: k.victimY, round: r.num });
      }
    }
    if (kind === 'plants' && r.planter && mine.has(r.planter) && r.plantX != null && r.plantY != null) out.push({ x: r.plantX, y: r.plantY, round: r.num });
    if (kind === 'defuses' && r.defuser && mine.has(r.defuser) && r.defuseX != null && r.defuseY != null) out.push({ x: r.defuseX, y: r.defuseY, round: r.num });
  }
  return out;
}
