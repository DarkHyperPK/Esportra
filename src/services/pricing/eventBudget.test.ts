import { describe, expect, it } from 'vitest';
import { calculateEventEarnings, quoteEventPass } from './eventBudget';

describe('event earnings', () => {
  it.each([
    [2, 0], [8, 0], [16, 0], [32, 0], [33, 12000], [64, 12000],
    [65, 25000], [128, 25000], [129, 45000], [256, 45000],
    [257, 80000], [512, 80000], [513, null], [10000, null],
  ])('prices %i teams with the appropriate Free, Pro or custom pass', (teams, price) => {
    expect(quoteEventPass(teams).price).toBe(price);
  });

  it('shows the full-registration upside on Free', () => {
    expect(calculateEventEarnings({ teams: 32, entryFee: 1000, prizePercent: 70 }))
      .toMatchObject({ receipts: 32000, prizes: 22400, earnings: 9600, pass: { kind: 'free', price: 0 } });
  });

  it('deducts the right Pro fee without concealing a loss at a tier boundary', () => {
    expect(calculateEventEarnings({ teams: 64, entryFee: 1000, prizePercent: 60 }).earnings).toBe(13600);
    expect(calculateEventEarnings({ teams: 65, entryFee: 1000, prizePercent: 70 }).earnings).toBe(-5500);
  });

  it('keeps unknown custom pricing out of the earnings figure', () => {
    expect(calculateEventEarnings({ teams: 1024, entryFee: 1000, prizePercent: 70 }))
      .toMatchObject({ receipts: 1024000, prizes: 716800, earnings: null, pass: { kind: 'custom', price: null } });
  });

  it('handles free entry and a full prize allocation', () => {
    expect(calculateEventEarnings({ teams: 32, entryFee: 0, prizePercent: 70 }).earnings).toBe(0);
    expect(calculateEventEarnings({ teams: 64, entryFee: 0, prizePercent: 70 }).earnings).toBe(-12000);
    expect(calculateEventEarnings({ teams: 64, entryFee: 1000, prizePercent: 100 }).earnings).toBe(-12000);
  });

  it('rounds receipts and prize allocation to currency precision', () => {
    expect(calculateEventEarnings({ teams: 3, entryFee: 333.33, prizePercent: 70 }))
      .toMatchObject({ receipts: 999.99, prizes: 699.99, earnings: 300 });
  });

  it('rejects impossible inputs', () => {
    for (const invalid of [{ teams: 1 }, { teams: 10001 }, { teams: 32.5 }, { entryFee: -1 }, { entryFee: Infinity }, { prizePercent: 101 }, { prizePercent: NaN }]) {
      expect(() => calculateEventEarnings({ teams: 32, entryFee: 1000, prizePercent: 70, ...invalid })).toThrow(RangeError);
    }
  });
});
