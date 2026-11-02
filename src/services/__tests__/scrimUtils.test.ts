import { describe, expect, it } from 'vitest';
import {
  BEST_OF_OPTIONS,
  bestOfLabel,
  bestOfLongLabel,
  findOverlappingListings,
  findOverlappingSessions,
  formatPreferredDays,
  isLegalSeriesScore,
  seriesOutcomeHint,
  validSeriesOutcomes,
  winsNeeded,
  toLocalInputValue,
} from '../scrimUtils';

describe('formatPreferredDays', () => {
  it('maps day indices to abbreviations', () => {
    expect(formatPreferredDays([1, 3, 5])).toEqual(['Mon', 'Wed', 'Fri']);
  });

  it('omits unknown indices and handles null', () => {
    expect(formatPreferredDays([9])).toEqual([]);
    expect(formatPreferredDays(null)).toEqual([]);
  });
});

describe('series format helpers', () => {
  it('normalizes unknown values to BO1', () => {
    expect(bestOfLabel(null)).toBe('BO1');
  });

  it('labels', () => {
    expect(bestOfLabel(3)).toBe('BO3');
    expect(bestOfLongLabel(5)).toBe('Best of 5');
    expect(BEST_OF_OPTIONS).toEqual([1, 3, 5]);
  });

  it('wins needed closes the majority', () => {
    expect(winsNeeded(1)).toBe(1);
    expect(winsNeeded(3)).toBe(2);
    expect(winsNeeded(5)).toBe(3);
  });

  it('lists legal outcomes only', () => {
    expect(validSeriesOutcomes(1)).toEqual([[1, 0], [0, 1]]);
    expect(validSeriesOutcomes(3)).toEqual([[2, 0], [0, 2], [2, 1], [1, 2]]);
    expect(validSeriesOutcomes(5)).toEqual([
      [3, 0], [0, 3], [3, 1], [1, 3], [3, 2], [2, 3],
    ]);
  });

  it('validates scores against the format', () => {
    expect(isLegalSeriesScore(3, 2, 1)).toBe(true);
    expect(isLegalSeriesScore(3, 2, 0)).toBe(true);
    expect(isLegalSeriesScore(3, 1, 2)).toBe(true);
    expect(isLegalSeriesScore(3, 13, 7)).toBe(false);
    expect(isLegalSeriesScore(3, 3, 0)).toBe(false);
    expect(isLegalSeriesScore(1, 1, 0)).toBe(true);
    expect(isLegalSeriesScore(1, 0, 0)).toBe(false);
    expect(isLegalSeriesScore(5, 3, 2)).toBe(true);
    expect(seriesOutcomeHint(3)).toBe('First to 2 wins');
  });
});

describe('findOverlappingSessions', () => {
  it('flags sessions whose time ranges intersect', () => {
    const overlaps = findOverlappingSessions([
      { id: 'a', scheduledAt: '2026-11-01T19:00:00Z', durationMinutes: 90 },
      { id: 'b', scheduledAt: '2026-11-01T20:00:00Z', durationMinutes: 90 },
    ]);
    expect(overlaps.get('a')).toEqual(['b']);
    expect(overlaps.get('b')).toEqual(['a']);
  });

  it('does not flag back-to-back or different-day sessions', () => {
    const overlaps = findOverlappingSessions([
      { id: 'a', scheduledAt: '2026-11-01T19:00:00Z', durationMinutes: 60 },
      { id: 'b', scheduledAt: '2026-11-01T20:00:00Z', durationMinutes: 60 },
      { id: 'c', scheduledAt: '2026-11-02T19:30:00Z', durationMinutes: 60 },
    ]);
    expect(overlaps.size).toBe(0);
  });

  it('falls back to the default duration and ignores untimed sessions', () => {
    const overlaps = findOverlappingSessions([
      { id: 'a', scheduledAt: '2026-11-01T19:00:00Z' },
      { id: 'b', scheduledAt: '2026-11-01T20:00:00Z' },
      { id: 'c', scheduledAt: null },
    ]);
    expect(overlaps.get('a')).toEqual(['b']);
    expect(overlaps.has('c')).toBe(false);
  });
});

describe('findOverlappingListings', () => {
  it('flags listings sharing a day and overlapping window', () => {
    const overlaps = findOverlappingListings([
      { id: 'a', preferredDays: [1, 3], preferredTimeStart: '19:00', preferredTimeEnd: '21:00' },
      { id: 'b', preferredDays: [3, 5], preferredTimeStart: '20:00', preferredTimeEnd: '22:00' },
    ]);
    expect(overlaps.get('a')).toEqual(['b']);
    expect(overlaps.get('b')).toEqual(['a']);
  });

  it('ignores disjoint days or non-overlapping windows', () => {
    const overlaps = findOverlappingListings([
      { id: 'a', preferredDays: [1], preferredTimeStart: '19:00', preferredTimeEnd: '21:00' },
      { id: 'b', preferredDays: [2], preferredTimeStart: '19:00', preferredTimeEnd: '21:00' },
      { id: 'c', preferredDays: [1], preferredTimeStart: '21:00', preferredTimeEnd: '23:00' },
    ]);
    expect(overlaps.size).toBe(0);
  });

  it('treats a missing window as all day', () => {
    const overlaps = findOverlappingListings([
      { id: 'a', preferredDays: [4], preferredTimeStart: '19:00', preferredTimeEnd: '21:00' },
      { id: 'b', preferredDays: [4], preferredTimeStart: null, preferredTimeEnd: null },
    ]);
    expect(overlaps.get('a')).toEqual(['b']);
  });
});

describe('toLocalInputValue', () => {
  it('renders local wall-clock time, not UTC', () => {
    const d = new Date(2026, 10, 2, 21, 5);
    expect(toLocalInputValue(d.toISOString())).toBe('2026-11-02T21:05');
  });
  it('returns empty for invalid input', () => {
    expect(toLocalInputValue('nope')).toBe('');
  });
});
