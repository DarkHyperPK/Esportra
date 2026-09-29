import { describe, expect, it } from 'vitest';
import { formatCountdown } from '../countdown';

describe('formatCountdown', () => {
  it('formats hours, minutes and seconds', () => {
    expect(formatCountdown(2 * 3600_000 + 5 * 60_000)).toBe('2h 5m');
    expect(formatCountdown(4 * 60_000 + 12_000)).toBe('4m 12s');
    expect(formatCountdown(9_000)).toBe('9s');
  });

  it('drops seconds when asked', () => {
    expect(formatCountdown(4 * 60_000 + 12_000, false)).toBe('4m');
    expect(formatCountdown(9_000, false)).toBe('<1m');
  });

  it('never goes negative', () => {
    expect(formatCountdown(-5_000)).toBe('0s');
  });
});
