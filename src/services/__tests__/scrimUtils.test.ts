import { describe, expect, it } from 'vitest';
import {
  BEST_OF_OPTIONS,
  bestOfLabel,
  bestOfLongLabel,
  formatPreferredDays,
  isLegalSeriesScore,
  seriesOutcomeHint,
  validSeriesOutcomes,
  winsNeeded,
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
