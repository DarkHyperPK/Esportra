import type { ScoreboardPlayer } from '@/types/scoreboardPlayer';

/** Columns a screenshot scoreboard can show, in display order. ACS/ADR/HS% are not on the client scoreboard. */
export const OCR_VIEW_COLUMNS = ['firstBloods', 'plants', 'defuses'] as const;
export type OcrViewColumn = (typeof OCR_VIEW_COLUMNS)[number];

const kills = (p: ScoreboardPlayer) => p.kills ?? 0;
const deaths = (p: ScoreboardPlayer) => p.deaths ?? 0;
const assists = (p: ScoreboardPlayer) => p.assists ?? 0;

/** Most kills first, then fewer deaths, then more assists (the client has no ACS to rank by). */
export function rankByImpact(players: ScoreboardPlayer[]): ScoreboardPlayer[] {
  return [...players].sort((a, b) => kills(b) - kills(a) || deaths(a) - deaths(b) || assists(b) - assists(a));
}

/** Key of the match MVP, or null when nobody has a kill. */
export function pickMvpKey(players: ScoreboardPlayer[]): string | null {
  const [top] = rankByImpact(players);
  if (!top || kills(top) === 0) return null;
  return top.puuid ?? top.gameName ?? null;
}

/** Only the columns at least one player has a value for. */
export function presentColumns(players: ScoreboardPlayer[]): OcrViewColumn[] {
  return OCR_VIEW_COLUMNS.filter((key) => players.some((p) => typeof p[key] === 'number'));
}

export function plusMinus(player: ScoreboardPlayer): number {
  return kills(player) - deaths(player);
}
