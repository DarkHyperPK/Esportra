import { describe, expect, it } from 'vitest';
import { groupSlotsByDay, slotCounts } from '../scrimSlots';

const slot = (id: string, startsAt: string, status = 'available') => ({ id, startsAt, status });

describe('groupSlotsByDay', () => {
  it('groups slots by local day, days in order and times in order within a day', () => {
    const groups = groupSlotsByDay([
      slot('c', new Date(2026, 10, 4, 20, 0).toISOString()),
      slot('b', new Date(2026, 10, 3, 21, 0).toISOString()),
      slot('a', new Date(2026, 10, 3, 19, 0).toISOString()),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].slots.map((s) => s.id)).toEqual(['a', 'b']);
    expect(groups[1].slots.map((s) => s.id)).toEqual(['c']);
  });

  it('labels each day for people', () => {
    const [g] = groupSlotsByDay([slot('a', new Date(2026, 10, 3, 19, 0).toISOString())]);
    expect(g.label).toMatch(/Tue/);
    expect(g.label).toMatch(/Nov/);
  });

  it('is empty for no slots and does not mutate its input', () => {
    expect(groupSlotsByDay([])).toEqual([]);
    const input = [slot('b', new Date(2026, 10, 3, 21, 0).toISOString()), slot('a', new Date(2026, 10, 3, 19, 0).toISOString())];
    groupSlotsByDay(input);
    expect(input.map((s) => s.id)).toEqual(['b', 'a']);
  });
});

describe('slotCounts', () => {
  it('counts what is open out of what exists', () => {
    expect(slotCounts([slot('a', 'x'), slot('b', 'x', 'booked'), slot('c', 'x', 'cancelled')])).toEqual({ open: 1, total: 3 });
    expect(slotCounts([])).toEqual({ open: 0, total: 0 });
  });
});
