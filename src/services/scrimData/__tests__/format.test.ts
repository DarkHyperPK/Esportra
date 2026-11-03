import { describe, expect, it } from 'vitest';
import { coverageNotes, formatNumber, formatPct, gameDate, isSmallSample, monthLabel, NO_VALUE, sampleLine, scoreLine } from '../format';
import type { Coverage } from '@/types/scrimData';

const coverage = (over: Partial<Coverage> = {}): Coverage => ({
  maps: 6, full: 2, screenshot: 2, scoreOnly: 2, riotPending: 0, riotNotVerified: 0, awaitingConfirmation: 0, disputed: 0, ...over,
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
  it('flags 1–9 maps but not none or ten and over', () => {
    expect([0, 1, 9, 10, 40].map(isSmallSample)).toEqual([false, true, true, false, false]);
  });
});

describe('sampleLine', () => {
  it('states the count and the date range', () => {
    expect(sampleLine(12, '2026-10-02T00:00:00Z', '2026-11-03T00:00:00Z')).toBe('Based on 12 confirmed scrim maps · Oct 2026 – Nov 2026');
  });

  it('collapses a single month, uses the singular and works without dates', () => {
    expect(sampleLine(1, '2026-10-02T00:00:00Z', '2026-10-09T00:00:00Z')).toBe('Based on 1 confirmed scrim map · Oct 2026');
    expect(sampleLine(3, null, null)).toBe('Based on 3 confirmed scrim maps');
  });
});

describe('labels', () => {
  it('formats months and dates without locale dependence', () => {
    expect(monthLabel('2026-10')).toBe('Oct 26');
    expect(gameDate('2026-10-03T23:30:00Z')).toBe('3 Oct 2026');
    expect(gameDate(null)).toBe(NO_VALUE);
  });

  it('shows the round score or a dash', () => {
    expect(scoreLine(13, 7)).toBe('13–7');
    expect(scoreLine(null, 7)).toBe(NO_VALUE);
  });
});

describe('coverageNotes', () => {
  it('says nothing when everything is counted and in', () => {
    expect(coverageNotes(coverage())).toEqual([]);
  });

  it('explains pending, mismatching, unconfirmed and disputed maps in words', () => {
    const notes = coverageNotes(coverage({ riotPending: 2, riotNotVerified: 1, awaitingConfirmation: 1, disputed: 3 }));
    expect(notes).toHaveLength(4);
    expect(notes[0]).toContain('2 auto-fetched maps are still waiting for Riot');
    expect(notes[1]).toContain('1 auto-fetched map does not match Riot’s record');
    expect(notes[2]).toContain('1 map is waiting for the other team to confirm');
    expect(notes[3]).toContain('3 disputed maps are not counted');
  });
});
