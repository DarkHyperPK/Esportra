import type { CareerGame, CareerSample, GameResult, PlayerCareerAccess } from '@/types/career';

/** Below this many verified games a figure is a first look, not a pattern. */
export const MIN_SAMPLE = 10;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const NO_VALUE = '—';

export function isSmallSample(matches: number): boolean {
  return matches > 0 && matches < MIN_SAMPLE;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  return value == null ? NO_VALUE : value.toFixed(digits);
}

export function formatPct(value: number | null | undefined): string {
  return value == null ? NO_VALUE : `${value.toFixed(1)}%`;
}

function day(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function monthYear(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "Based on 12 verified games · Oct 2026 – Nov 2026": what a figure rests on. */
export function sampleLine(sample: CareerSample): string {
  const games = `${sample.matches} verified ${sample.matches === 1 ? 'game' : 'games'}`;
  if (!sample.from || !sample.to) return `Based on ${games}`;
  const from = monthYear(sample.from);
  const to = monthYear(sample.to);
  return `Based on ${games} · ${from === to ? from : `${from} – ${to}`}`;
}

/** "2026-10" → "Oct 26" */
export function monthLabel(month: string): string {
  const [year, m] = month.split('-');
  const index = Number(m) - 1;
  return `${MONTHS[index] ?? month} ${year?.slice(2) ?? ''}`.trim();
}

export function gameDate(iso: string | null): string {
  return iso ? day(iso) : NO_VALUE;
}

export const RESULT_LABEL: Record<GameResult, string> = { win: 'Win', loss: 'Loss', draw: 'Draw' };

export function scoreLine(game: Pick<CareerGame, 'roundsWon' | 'roundsLost'>): string {
  return game.roundsWon == null || game.roundsLost == null ? NO_VALUE : `${game.roundsWon}–${game.roundsLost}`;
}

/** The personal line under a player's game: "20/10/4 · ACS 250". Empty for team rows. */
export function playerLine(game: CareerGame): string {
  if (game.kills == null) return '';
  const base = `${game.kills}/${game.deaths ?? 0}/${game.assists ?? 0}`;
  return game.acs == null ? base : `${base} · ACS ${Math.round(game.acs)}`;
}

/** What the viewer is looking at, in plain words. Null when no explanation is needed. */
export function accessNotice(access: PlayerCareerAccess, scope: 'all' | 'your_teams' | 'public'): string | null {
  switch (access) {
    case 'self':
      return 'Only you and the staff of your teams can see this. You choose whether it is public in Settings.';
    case 'admin':
      return 'Staff view: all verified games.';
    case 'team_staff':
      return scope === 'your_teams' ? 'You can see the games this player played for your team.' : null;
    case 'public':
      return 'Shared publicly by the player. Scrim games are not listed.';
    default:
      return null;
  }
}

export const EMPTY_RECORD_TEXT =
  'No verified games yet. A game counts once its Riot match is attached to a scrim or tournament result and Riot’s own record agrees with it.';
