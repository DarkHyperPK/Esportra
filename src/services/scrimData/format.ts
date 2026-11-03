import type { Coverage, DataTier, GameResult } from '@/types/scrimData';

/** Below this many maps a figure is a first look, not a pattern. */
export const MIN_SAMPLE = 10;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const NO_VALUE = '—';

export function isSmallSample(maps: number): boolean {
  return maps > 0 && maps < MIN_SAMPLE;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  return value == null ? NO_VALUE : value.toFixed(digits);
}

export function formatPct(value: number | null | undefined): string {
  return value == null ? NO_VALUE : `${value.toFixed(1)}%`;
}

function monthYear(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function gameDate(iso: string | null): string {
  if (!iso) return NO_VALUE;
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "Based on 12 confirmed scrim maps · Oct 2026 – Nov 2026": what a figure rests on. */
export function sampleLine(maps: number, from: string | null, to: string | null): string {
  const base = `Based on ${maps} confirmed scrim ${maps === 1 ? 'map' : 'maps'}`;
  if (!from || !to) return base;
  const a = monthYear(from);
  const b = monthYear(to);
  return `${base} · ${a === b ? a : `${a} – ${b}`}`;
}

/** "2026-10" → "Oct 26" */
export function monthLabel(month: string): string {
  const [year, m] = month.split('-');
  return `${MONTHS[Number(m) - 1] ?? month} ${year?.slice(2) ?? ''}`.trim();
}

export const RESULT_LABEL: Record<GameResult, string> = { win: 'Win', loss: 'Loss', draw: 'Draw' };

export function scoreLine(won: number | null, lost: number | null): string {
  return won == null || lost == null ? NO_VALUE : `${won}–${lost}`;
}

export const TIER_LABEL: Record<DataTier, string> = { full: 'Full data', screenshot: 'Screenshot', score_only: 'Score only' };

export const TIER_MEANING: Record<DataTier, string> = {
  full: 'Auto-fetched from Riot: every player, every round.',
  screenshot: 'Read from the scoreboard screenshot: each player’s own line, no round-by-round detail.',
  score_only: 'Only the result and the map. No player data.',
};

/** Plain sentences about what is and is not in the numbers, so a thin page explains itself. */
export function coverageNotes(c: Coverage): string[] {
  const notes: string[] = [];
  if (c.riotPending > 0) notes.push(`${c.riotPending} auto-fetched ${c.riotPending === 1 ? 'map is' : 'maps are'} still waiting for Riot. Riot can take a few minutes to list a custom game, so this fills in by itself.`);
  if (c.riotNotVerified > 0) notes.push(`${c.riotNotVerified} auto-fetched ${c.riotNotVerified === 1 ? 'map does' : 'maps do'} not match Riot’s record, so only the result counts for ${c.riotNotVerified === 1 ? 'it' : 'them'}.`);
  if (c.queueGames > 0) notes.push(`${c.queueGames} ${c.queueGames === 1 ? 'map was' : 'maps were'} played in a matchmade queue (ranked or similar), not a custom game, so only your side and the score were checked.`);
  if (c.awaitingConfirmation > 0) notes.push(`${c.awaitingConfirmation} ${c.awaitingConfirmation === 1 ? 'map is' : 'maps are'} waiting for the other team to confirm and ${c.awaitingConfirmation === 1 ? 'is' : 'are'} not counted yet.`);
  if (c.disputed > 0) notes.push(`${c.disputed} disputed ${c.disputed === 1 ? 'map is' : 'maps are'} not counted.`);
  return notes;
}

export const EMPTY_TEXT =
  'No confirmed scrim maps yet. A map counts once the other team confirms its result. Reporting with auto-fetch or a screenshot adds player stats.';
