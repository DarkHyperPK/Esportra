import { describe, expect, it } from 'vitest';
import {
  checkinWindowStartMs,
  normalizeScheduledTime,
  parseScheduledTimeMs,
} from '@/utils/scheduledTime';

describe('scheduledTime', () => {
  it('normalizes ISO strings to canonical UTC', () => {
    expect(normalizeScheduledTime('2025-06-14T19:20:00.000Z')).toBe('2025-06-14T19:20:00.000Z');
  });

  it('parses local datetime strings consistently', () => {
    const ms = parseScheduledTimeMs('2025-06-15T00:20:00');
    expect(ms).not.toBeNull();
    expect(normalizeScheduledTime('2025-06-15T00:20:00')).toBe(new Date(ms!).toISOString());
  });

  it('computes check-in window start from scheduled time', () => {
    const scheduled = '2025-06-14T19:20:00.000Z';
    expect(checkinWindowStartMs(scheduled, 15)).toBe(
      Date.parse('2025-06-14T19:05:00.000Z'),
    );
  });
});
