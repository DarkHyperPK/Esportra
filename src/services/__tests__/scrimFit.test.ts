import { describe, expect, it } from 'vitest';
import { deriveScrimFit } from '../scrimFit';
import { formatRecord } from '../scrimDiscoveryUtils';
import { isUpcomingSession, offerStatusMeta, sessionStatusMeta } from '../scrimStatusMeta';

const team = (region: string | null, min: number | null, max: number | null) => ({
  regionKey: region,
  minRankSortOrder: min,
  maxRankSortOrder: max,
});

describe('deriveScrimFit', () => {
  it('is good when bands overlap in the same region', () => {
    expect(deriveScrimFit(team('eu', 3, 6), team('eu', 5, 9)).level).toBe('good');
  });
  it('is partial when bands do not overlap', () => {
    const f = deriveScrimFit(team('eu', 1, 2), team('eu', 5, 9));
    expect(f.level).toBe('partial');
    expect(f.rankOverlap).toBe(false);
  });
  it('is partial on a region mismatch', () => {
    expect(deriveScrimFit(team('eu', 3, 6), team('na', 3, 6)).level).toBe('partial');
  });
  it('is unknown with no data', () => {
    expect(deriveScrimFit(team(null, null, null), team(null, null, null)).level).toBe('unknown');
  });
  it('treats a single-sided band as a point', () => {
    expect(deriveScrimFit(team('eu', 4, null), team('eu', 4, 8)).rankOverlap).toBe(true);
  });
});

describe('record formatters', () => {
  it('omits zero draws', () => {
    expect(formatRecord({ wins: 12, losses: 4 })).toBe('12-4');
    expect(formatRecord({ wins: 12, losses: 4, draws: 1 })).toBe('12-4-1');
  });
});

describe('scrimStatusMeta', () => {
  it('counts live sessions as upcoming', () => {
    expect(isUpcomingSession('in_progress')).toBe(true);
    expect(isUpcomingSession('completed')).toBe(false);
  });
  it('maps labels and tones', () => {
    expect(sessionStatusMeta('disputed').tone).toBe('warning');
    expect(offerStatusMeta('accepted').label).toBe('Accepted');
  });
});
