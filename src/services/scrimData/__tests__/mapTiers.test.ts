import { describe, expect, it } from 'vitest';
import { mapRating, mapTiers, tierOf } from '../mapTiers';
import type { MapIntel } from '@/types/scrimData';

const side = { played: 0, won: 0, pct: null };
const map = (name: string, games: number, roundsWon: number, roundsLost: number): MapIntel => ({
  mapId: name, map: name, games, wins: 0, winRatePct: null, winLowPct: null, winHighPct: null, roundsWon, roundsLost, roundWinRatePct: null, attack: side, defense: side, lastPlayed: null, signal: 'insufficient_sample',
});

describe('map tiers', () => {
  it('rates a map by rounds with half a map of prior at 50%', () => {
    expect(mapRating({ roundsWon: 0, roundsLost: 0 })).toBe(50);
    expect(mapRating({ roundsWon: 26, roundsLost: 14 })).toBe(59.1);   // (26 + 13) / (40 + 26)
    expect(mapRating({ roundsWon: 10, roundsLost: 30 })).toBe(34.8);   // (10 + 13) / (40 + 26)
  });

  it('a lopsided single map is pulled towards the middle, not crowned', () => {
    expect(mapRating({ roundsWon: 13, roundsLost: 0 })).toBe(66.7);
    expect(tierOf(mapRating({ roundsWon: 13, roundsLost: 0 }))).toBe('S');
    expect(mapRating({ roundsWon: 7, roundsLost: 4 })).toBe(54.1);
  });

  it('places the tier boundaries on the cut-offs', () => {
    expect([58, 57.9, 54, 53.9, 50, 49.9, 46, 45.9].map(tierOf)).toEqual(['S', 'A', 'A', 'B', 'B', 'C', 'C', 'D']);
  });

  it('puts maps in tiers best first and keeps maps with too few games out of the list', () => {
    const list = mapTiers([map('Lotus', 4, 52, 28), map('Bind', 3, 40, 40), map('Haven', 3, 30, 50), map('Split', 1, 13, 2), map('Ascent', 2, 26, 14)]);
    expect(list.tiers.S.map((r) => r.map.map)).toEqual(['Lotus', 'Ascent']);
    expect(list.tiers.B.map((r) => r.map.map)).toEqual(['Bind']);
    expect(list.tiers.D.map((r) => r.map.map)).toEqual(['Haven']);
    expect(list.unranked.map((m) => m.map)).toEqual(['Split']);
    expect(list.tiers.A).toEqual([]);
  });

  it('breaks ties by maps played, then name', () => {
    const list = mapTiers([map('B', 2, 20, 20), map('A', 2, 20, 20), map('C', 3, 30, 30)]);
    expect(list.tiers.B.map((r) => r.map.map)).toEqual(['C', 'A', 'B']);
  });
});
