import { describe, it, expect } from 'vitest';
import {
  classifyNodeHealth,
  nodeNeedsAttention,
  relativeLastSeen,
  ONLINE_THRESHOLD_MS,
  STALE_THRESHOLD_MS,
} from '../broadcastNodeRules';

const NOW = new Date('2026-11-01T12:00:00Z');

function seenAgo(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

describe('classifyNodeHealth', () => {
  it('returns offline when lastSeenAt is null', () => {
    expect(classifyNodeHealth(null, NOW)).toBe('offline');
  });

  it('returns online when within online threshold', () => {
    expect(classifyNodeHealth(seenAgo(5_000), NOW)).toBe('online');
  });

  it('returns online at exactly 1ms before online threshold', () => {
    expect(classifyNodeHealth(seenAgo(ONLINE_THRESHOLD_MS - 1), NOW)).toBe('online');
  });

  it('returns stale at exactly online threshold', () => {
    expect(classifyNodeHealth(seenAgo(ONLINE_THRESHOLD_MS), NOW)).toBe('stale');
  });

  it('returns stale between thresholds', () => {
    expect(classifyNodeHealth(seenAgo(30_000), NOW)).toBe('stale');
  });

  it('returns stale at 1ms before stale threshold', () => {
    expect(classifyNodeHealth(seenAgo(STALE_THRESHOLD_MS - 1), NOW)).toBe('stale');
  });

  it('returns offline at exactly stale threshold', () => {
    expect(classifyNodeHealth(seenAgo(STALE_THRESHOLD_MS), NOW)).toBe('offline');
  });

  it('returns offline for very old timestamps', () => {
    expect(classifyNodeHealth(seenAgo(600_000), NOW)).toBe('offline');
  });
});

describe('nodeNeedsAttention', () => {
  it('is false for online nodes', () => {
    expect(nodeNeedsAttention('online')).toBe(false);
  });

  it('is true for stale nodes', () => {
    expect(nodeNeedsAttention('stale')).toBe(true);
  });

  it('is true for offline nodes', () => {
    expect(nodeNeedsAttention('offline')).toBe(true);
  });
});

describe('relativeLastSeen', () => {
  it('returns Never for null', () => {
    expect(relativeLastSeen(null, NOW)).toBe('Never');
  });

  it('returns seconds for sub-minute', () => {
    expect(relativeLastSeen(seenAgo(30_000), NOW)).toBe('30s ago');
  });

  it('returns minutes for 2 minutes', () => {
    expect(relativeLastSeen(seenAgo(2 * 60_000), NOW)).toBe('2m ago');
  });

  it('returns hours for 3 hours', () => {
    expect(relativeLastSeen(seenAgo(3 * 60 * 60_000), NOW)).toBe('3h ago');
  });
});
