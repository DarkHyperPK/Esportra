import type { Tone } from '@/components/ui/kit/tone';
import { bundledValorantAgents } from '@/lib/valorantUiAssets';
import { NO_VALUE } from '@/services/scrimData/format';
import type { MapIntel, MapSignal } from '@/types/scrimData';

const ROLE_ORDER = ['Duelist', 'Initiator', 'Controller', 'Sentinel'] as const;

/** The role of an agent from bundled metadata, kept apart from match data so a game update never rewrites history. */
export function roleOf(characterId: string): string | null {
  return bundledValorantAgents[characterId.toLowerCase()]?.role ?? null;
}

/** "1 Duelist · 2 Initiators · 1 Controller · 1 Sentinel"; agents without known metadata are counted as "unknown". */
export function roleSummary(agents: string[]): string {
  const counts = new Map<string, number>();
  for (const id of agents) {
    const role = roleOf(id) ?? 'Unknown';
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  const known = ROLE_ORDER.filter((r) => counts.has(r)).map((r) => `${counts.get(r)} ${r}${(counts.get(r) ?? 0) > 1 ? 's' : ''}`);
  const unknown = counts.get('Unknown');
  return [...known, ...(unknown ? [`${unknown} unknown`] : [])].join(' · ');
}

export interface SignalView { label: string; tone: Tone }

export function signalView(signal: MapSignal): SignalView {
  switch (signal) {
    case 'strong': return { label: 'Clear strength', tone: 'success' };
    case 'weak': return { label: 'Clear weakness', tone: 'critical' };
    case 'typical': return { label: 'In line with overall', tone: 'neutral' };
    default: return { label: 'Too few maps', tone: 'neutral' };
  }
}

/** "68–100%": the range a win rate could plausibly sit in, given how few maps there are. */
export function rangeText(low: number | null, high: number | null): string {
  return low == null || high == null ? NO_VALUE : `${Math.round(low)}–${Math.round(high)}%`;
}

export function mapSignalExplanation(minSample: number): string {
  return `A map is only called a strength or weakness after ${minSample} maps, and only when the range its win rate could plausibly sit in (95%) clears the team’s overall win rate.`;
}

/** Most and least practised maps; pool maps never played count as least practised. */
export function practiceSummary(maps: MapIntel[], unplayed: string[]): { most: string | null; least: string | null } {
  if (maps.length === 0) return { most: null, least: unplayed[0] ?? null };
  const sorted = [...maps].sort((a, b) => b.games - a.games || a.map.localeCompare(b.map));
  return { most: sorted[0].map, least: unplayed[0] ?? sorted[sorted.length - 1].map };
}
