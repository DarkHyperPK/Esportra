import { describe, expect, it } from 'vitest';
import {
  accessNotice, formatNumber, formatPct, gameDate, isSmallSample, monthLabel, NO_VALUE, playerLine, sampleLine, scoreLine,
} from '../format';
import type { CareerGame } from '@/types/career';

const game = (over: Partial<CareerGame> = {}): CareerGame => ({
  startedAt: '2026-10-03T12:00:00Z', context: 'scrim', scrimSessionId: 's', tournamentMatchId: null, gameNumber: 1, map: 'Ascent',
  opponentName: 'Omega', result: 'win', roundsWon: 13, roundsLost: 7, ...over,
});

describe('numbers', () => {
  it('shows a dash instead of inventing a value', () => {
    expect(formatNumber(null)).toBe(NO_VALUE);
    expect(formatNumber(undefined)).toBe(NO_VALUE);
    expect(formatPct(null)).toBe(NO_VALUE);
  });

  it('formats real values, including zero', () => {
    expect(formatNumber(1.25)).toBe('1.25');
    expect(formatNumber(0)).toBe('0.00');
    expect(formatNumber(200, 0)).toBe('200');
    expect(formatPct(66.666)).toBe('66.7%');
  });
});

describe('isSmallSample', () => {
  it('flags 1–9 games but not none or ten and over', () => {
    expect([0, 1, 9, 10, 40].map(isSmallSample)).toEqual([false, true, true, false, false]);
  });
});

describe('sampleLine', () => {
  it('states the count and the date range', () => {
    expect(sampleLine({ matches: 12, rounds: 240, from: '2026-10-02T00:00:00Z', to: '2026-11-03T00:00:00Z' })).toBe('Based on 12 verified games · Oct 2026 – Nov 2026');
  });

  it('collapses a single month and uses the singular', () => {
    expect(sampleLine({ matches: 1, rounds: 20, from: '2026-10-02T00:00:00Z', to: '2026-10-02T00:00:00Z' })).toBe('Based on 1 verified game · Oct 2026');
  });

  it('works without dates', () => {
    expect(sampleLine({ matches: 3, rounds: 60, from: null, to: null })).toBe('Based on 3 verified games');
  });
});

describe('labels', () => {
  it('formats months and dates without locale dependence', () => {
    expect(monthLabel('2026-10')).toBe('Oct 26');
    expect(monthLabel('2027-01')).toBe('Jan 27');
    expect(gameDate('2026-10-03T23:30:00Z')).toBe('3 Oct 2026');
    expect(gameDate(null)).toBe(NO_VALUE);
  });

  it('shows the round score or a dash', () => {
    expect(scoreLine(game())).toBe('13–7');
    expect(scoreLine(game({ roundsWon: null }))).toBe(NO_VALUE);
  });

  it('builds the personal line only for player rows', () => {
    expect(playerLine(game({ kills: 20, deaths: 10, assists: 4, acs: 249.6 }))).toBe('20/10/4 · ACS 250');
    expect(playerLine(game({ kills: 20, deaths: 10, assists: 4, acs: null }))).toBe('20/10/4');
    expect(playerLine(game())).toBe('');
  });
});

describe('accessNotice', () => {
  it('explains each view in words', () => {
    expect(accessNotice('self', 'all')).toContain('Only you');
    expect(accessNotice('team_staff', 'your_teams')).toContain('for your team');
    expect(accessNotice('public', 'public')).toContain('Scrim games are not listed');
    expect(accessNotice('none', 'all')).toBeNull();
  });
});
