import { describe, expect, it } from 'vitest';
import { practiceSummary, rangeText, roleOf, roleSummary, signalView } from '../presentation';
import type { MapIntel } from '@/types/scrimData';

const side = { played: 0, won: 0, pct: null };
const map = (name: string, games: number): MapIntel => ({
  mapId: name, map: name, games, wins: 0, winRatePct: null, winLowPct: null, winHighPct: null, roundsWon: 0, roundsLost: 0, roundWinRatePct: null,
  attack: side, defense: side, lastPlayed: null, signal: 'typical',
});

describe('signalView', () => {
  it('colours only clear signals and never calls a thin map anything', () => {
    expect(signalView('strong').tone).toBe('success');
    expect(signalView('weak').tone).toBe('critical');
    expect(signalView('typical').tone).toBe('neutral');
    expect(signalView('insufficient_sample')).toEqual({ label: 'Too few maps', tone: 'neutral' });
  });
});

describe('rangeText', () => {
  it('rounds the range and shows a dash without one', () => {
    expect(rangeText(67.6, 100)).toBe('68–100%');
    expect(rangeText(null, 50)).toBe('—');
  });
});

describe('roles', () => {
  it('reads roles from bundled agent metadata and counts unknown agents honestly', () => {
    expect(roleOf('not-an-agent')).toBeNull();
    expect(roleSummary(['not-an-agent', 'also-not'])).toBe('2 unknown');
    expect(roleSummary([])).toBe('');
  });
});

describe('practiceSummary', () => {
  it('names the most practised map and treats a never-played pool map as least practised', () => {
    expect(practiceSummary([map('Ascent', 5), map('Bind', 2)], ['Split'])).toEqual({ most: 'Ascent', least: 'Split' });
    expect(practiceSummary([map('Ascent', 5), map('Bind', 2)], [])).toEqual({ most: 'Ascent', least: 'Bind' });
    expect(practiceSummary([], ['Split'])).toEqual({ most: null, least: 'Split' });
  });
});
