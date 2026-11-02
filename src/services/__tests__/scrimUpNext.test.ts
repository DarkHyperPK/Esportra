import { describe, expect, it } from 'vitest';
import { describeUpNext, formatTimeLeft, pickLead, withoutType } from '../scrimUpNext';
import type { ScrimUpNextItem } from '@/types/competitive';

const NOW = Date.parse('2026-11-02T20:00:00Z');
const at = (min: number) => new Date(NOW + min * 60_000).toISOString();

function item(over: Partial<ScrimUpNextItem> = {}): ScrimUpNextItem {
  return {
    type: 'checkin_open',
    teamId: 't1',
    sessionId: 's1',
    offerId: null,
    listingId: null,
    opponentName: 'Nova',
    opponentLogo: null,
    gameSlug: 'valorant',
    scheduledAt: at(0),
    deadline: at(15),
    ...over,
  };
}

describe('formatTimeLeft', () => {
  it('formats minutes, hours and days', () => {
    expect(formatTimeLeft(at(5), NOW)).toBe('5 min');
    expect(formatTimeLeft(at(125), NOW)).toBe('2h 5m');
    expect(formatTimeLeft(at(60 * 30), NOW)).toBe('1d 6h');
  });
  it('says under a minute and handles past or missing', () => {
    expect(formatTimeLeft(new Date(NOW + 20_000).toISOString(), NOW)).toBe('under a minute');
    expect(formatTimeLeft(at(-1), NOW)).toBeNull();
    expect(formatTimeLeft(null, NOW)).toBeNull();
    expect(formatTimeLeft('nope', NOW)).toBeNull();
  });
});

describe('describeUpNext', () => {
  it('links session items to the room and offers to the workspace', () => {
    expect(describeUpNext(item(), NOW).href).toBe('/competitive/scrims/sessions/s1');
    expect(describeUpNext(item({ type: 'offer_received', sessionId: null, offerId: 'o1' }), NOW).href)
      .toBe('/competitive/scrims/workspace');
  });

  it('marks check-in as urgent and names the opponent and deadline', () => {
    const d = describeUpNext(item(), NOW);
    expect(d.urgent).toBe(true);
    expect(d.title).toContain('Nova');
    expect(d.cta).toBe('Check in');
    expect(d.detail).toContain('15 min');
  });

  it('gives every type a title, cta and href', () => {
    const types = ['checkin_open', 'veto_ready', 'result_to_confirm', 'time_to_respond', 'evidence_due', 'result_to_report', 'time_to_propose', 'offer_received'] as const;
    for (const type of types) {
      const d = describeUpNext(item({ type, deadline: type === 'offer_received' ? at(600) : null }), NOW);
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.cta.length).toBeGreaterThan(0);
      expect(d.href.startsWith('/competitive/scrims')).toBe(true);
    }
  });

  it('falls back when the opponent name is missing', () => {
    expect(describeUpNext(item({ opponentName: null }), NOW).title).toContain('your opponent');
  });

  it('does not claim a time when the deadline already passed', () => {
    expect(describeUpNext(item({ deadline: at(-3) }), NOW).detail).not.toMatch(/-?\d+ min/);
  });
});

describe('pickLead', () => {
  it('returns the first item and the count of the rest', () => {
    const items = [item(), item({ type: 'offer_received' }), item({ type: 'result_to_report' })];
    expect(pickLead({ items, total: 3 })).toEqual({ lead: items[0], more: 2 });
  });
  it('counts items hidden by the server cap', () => {
    expect(pickLead({ items: [item()], total: 9 }).more).toBe(8);
  });
  it('is null for an empty or missing queue', () => {
    expect(pickLead({ items: [], total: 0 })).toEqual({ lead: null, more: 0 });
    expect(pickLead(undefined)).toEqual({ lead: null, more: 0 });
  });
});

describe('withoutType', () => {
  it('removes the type and adjusts the total', () => {
    const items = [item({ type: 'offer_received' }), item(), item({ type: 'offer_received' })];
    const out = withoutType({ items, total: 7 }, 'offer_received');
    expect(out?.items.map((i) => i.type)).toEqual(['checkin_open']);
    expect(out?.total).toBe(5);
  });
  it('passes undefined through and never reports fewer than it holds', () => {
    expect(withoutType(undefined, 'offer_received')).toBeUndefined();
    expect(withoutType({ items: [item()], total: 0 }, 'offer_received')?.total).toBe(1);
  });
});

describe('time items', () => {
  it('asks to respond to a proposal, and to pick a time, naming the opponent', () => {
    const respond = describeUpNext(item({ type: 'time_to_respond', deadline: null }), NOW);
    expect(respond.title).toBe('Nova proposed a match time');
    expect(respond.cta).toBe('Respond');
    expect(respond.urgent).toBe(false);
    const propose = describeUpNext(item({ type: 'time_to_propose', deadline: null }), NOW);
    expect(propose.title).toBe('Pick a time with Nova');
    expect(propose.href).toBe('/competitive/scrims/sessions/s1');
  });
});
