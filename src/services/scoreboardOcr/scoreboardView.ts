import type { ScoreboardPlayer } from '@/types/scoreboardPlayer';

/** Stat columns after K/D/A, in display order. ACS (the 2026 client's Performance Score) is shown
 * separately, right after the player. ADR and HS% are not on the client scoreboard. */
export const OCR_VIEW_COLUMNS = ['trades', 'firstBloods', 'plants', 'defuses'] as const;
export type OcrViewColumn = (typeof OCR_VIEW_COLUMNS)[number];

const kills = (p: ScoreboardPlayer) => p.kills ?? 0;
const deaths = (p: ScoreboardPlayer) => p.deaths ?? 0;
const assists = (p: ScoreboardPlayer) => p.assists ?? 0;
const acs = (p: ScoreboardPlayer) => p.acs ?? -1;

/** ACS first when the screenshot had it (as the client sorts), then kills, fewer deaths, assists. */
export function rankByImpact(players: ScoreboardPlayer[]): ScoreboardPlayer[] {
  return [...players].sort((a, b) => acs(b) - acs(a) || kills(b) - kills(a) || deaths(a) - deaths(b) || assists(b) - assists(a));
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

export function hasAcs(players: ScoreboardPlayer[]): boolean {
  return players.some((p) => typeof p.acs === 'number');
}

export function plusMinus(player: ScoreboardPlayer): number {
  return kills(player) - deaths(player);
}
