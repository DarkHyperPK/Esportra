import type { GameResult, RecentMap } from '@/types/scrimData';

export interface HistoryFilter { map: string; opponent: string; result: '' | GameResult }

/** The maps matching every set filter; "" means any. Order is kept (newest first, as the API sends it). */
export function filterHistory(maps: RecentMap[], f: HistoryFilter): RecentMap[] {
  return maps.filter((m) => (!f.map || m.map === f.map) && (!f.opponent || m.opponent === f.opponent) && (!f.result || m.result === f.result));
}

/** The distinct maps and opponents in the history, by how often they come up, for the filter dropdowns. */
export function historyOptions(maps: RecentMap[]): { maps: string[]; opponents: string[] } {
  const ranked = (values: Array<string | null>) => {
    const counts = new Map<string, number>();
    for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([v]) => v);
  };
  return { maps: ranked(maps.map((m) => m.map)), opponents: ranked(maps.map((m) => m.opponent)) };
}

/** Record and round difference for a set of maps. Rounds count only where both scores are known. */
export function historySummary(maps: RecentMap[]): { wins: number; losses: number; draws: number; roundDiff: number } {
  return maps.reduce((s, m) => ({
    wins: s.wins + (m.result === 'win' ? 1 : 0),
    losses: s.losses + (m.result === 'loss' ? 1 : 0),
    draws: s.draws + (m.result === 'draw' ? 1 : 0),
    roundDiff: s.roundDiff + (m.roundsWon != null && m.roundsLost != null ? m.roundsWon - m.roundsLost : 0),
  }), { wins: 0, losses: 0, draws: 0, roundDiff: 0 });
}
