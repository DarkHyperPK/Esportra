import { describe, expect, it } from 'vitest';
import { buildMonthGrid, monthLabel, shiftMonth, unscheduledMatches, type CalendarSession } from '../scrimCalendar';

const at = (m: number, d: number, h = 20) => new Date(2026, m, d, h, 0).toISOString();
let n = 0;
const s = (over: Partial<CalendarSession> = {}): CalendarSession => ({
  id: `s${++n}`, status: 'scheduled', scheduledAt: at(10, 12), opponentName: 'Nova', ...over,
});
const today = new Date(2026, 10, 12, 9, 0);

describe('buildMonthGrid', () => {
  it('lays out whole weeks, Monday first, covering the month', () => {
    const grid = buildMonthGrid(2026, 10, [], today);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid[0][0].date.getDay()).toBe(1); // Monday
    const inMonth = grid.flat().filter((d) => d.inMonth);
    expect(inMonth).toHaveLength(30); // November
    expect(grid.length).toBeGreaterThanOrEqual(5);
  });

  it('marks today and the days outside the month', () => {
    const flat = buildMonthGrid(2026, 10, [], today).flat();
    expect(flat.filter((d) => d.isToday)).toHaveLength(1);
    expect(flat.find((d) => d.isToday)?.date.getDate()).toBe(12);
    expect(flat[0].inMonth).toBe(false); // Nov 1 2026 is a Sunday, so the grid starts in October
  });

  it('puts each match on its local day, soonest first', () => {
    const flat = buildMonthGrid(2026, 10, [s({ id: 'late', scheduledAt: at(10, 12, 22) }), s({ id: 'early', scheduledAt: at(10, 12, 18) })], today).flat();
    const day = flat.find((d) => d.inMonth && d.date.getDate() === 12)!;
    expect(day.items.map((i) => i.id)).toEqual(['early', 'late']);
  });

  it('shows matches spilling into the visible days of the neighbouring months', () => {
    const flat = buildMonthGrid(2026, 10, [s({ scheduledAt: at(9, 31) })], today).flat();
    expect(flat.find((d) => !d.inMonth && d.date.getMonth() === 9 && d.date.getDate() === 31)?.items).toHaveLength(1);
  });

  it('leaves out cancelled matches and ones with no time', () => {
    const flat = buildMonthGrid(2026, 10, [s({ status: 'cancelled' }), s({ scheduledAt: null })], today).flat();
    expect(flat.flatMap((d) => d.items)).toHaveLength(0);
  });

  it('keeps finished matches, flagged as done', () => {
    const item = buildMonthGrid(2026, 10, [s({ status: 'completed' })], today).flat().flatMap((d) => d.items)[0];
    expect(item.done).toBe(true);
  });

  it('carries what a chip needs: opponent, time and status', () => {
    const item = buildMonthGrid(2026, 10, [s({ status: 'in_progress', opponentName: null })], today).flat().flatMap((d) => d.items)[0];
    expect(item.opponent).toBe('Opponent');
    expect(item.timeLabel).toMatch(/8:00/);
    expect(item.live).toBe(true);
  });

  it('handles a month that starts on Monday and one that needs six weeks', () => {
    expect(buildMonthGrid(2026, 5, [], today)[0][0].date.getDate()).toBe(1); // Jun 1 2026 is a Monday
    expect(buildMonthGrid(2026, 7, [], today)).toHaveLength(6); // Aug 2026 spans six weeks
  });
});

describe('unscheduledMatches', () => {
  it('lists matches still waiting for a time, and nothing else', () => {
    const out = unscheduledMatches([s({ scheduledAt: null, id: 'a' }), s({ scheduledAt: null, status: 'cancelled' }), s({ scheduledAt: null, status: 'completed' }), s()]);
    expect(out.map((m) => m.id)).toEqual(['a']);
  });
});

describe('month navigation', () => {
  it('moves across year boundaries', () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2026, month: 5 }, 0)).toEqual({ year: 2026, month: 5 });
  });
  it('labels the month for people', () => {
    expect(monthLabel({ year: 2026, month: 10 })).toMatch(/November/);
    expect(monthLabel({ year: 2026, month: 10 })).toMatch(/2026/);
  });
});
