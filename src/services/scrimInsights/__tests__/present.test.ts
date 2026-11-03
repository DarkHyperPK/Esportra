import { describe, expect, it } from 'vitest';
import { assetLabel, money, rateText, roundClock } from '../present';

describe('scrim insights presentation', () => {
  it('formats times into a round', () => {
    expect(roundClock(4000)).toBe('0:04');
    expect(roundClock(63000)).toBe('1:03');
    expect(roundClock(null)).toBe('—');
  });

  it('states a rate with its sample, and a dash when there is none', () => {
    expect(rateText({ count: 3, of: 5, pct: 60 })).toBe('3 of 5 · 60%');
    expect(rateText({ count: 0, of: 0, pct: null })).toBe('—');
  });

  it('formats money and never prints a missing value as zero', () => {
    expect(money(4000)).toBe('4,000');
    expect(money(null)).toBe('—');
  });

  it('shows a weapon name, never a raw id', () => {
    const catalog = new Map([['9c82e19d-4575-0200-1a81-3eacf00cf872', 'Vandal']]);
    expect(assetLabel('9C82E19D-4575-0200-1A81-3EACF00CF872', catalog)).toBe('Vandal');
    expect(assetLabel('1234abcd-4575-0200-1a81-3eacf00cf872', catalog)).toBe('Unknown');
    expect(assetLabel('Vandal', undefined)).toBe('Vandal');
    expect(assetLabel('', undefined)).toBe('—');
  });
});
