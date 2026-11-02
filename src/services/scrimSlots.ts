/** Pure helpers for the slot picker on a scrim listing. */

export interface SlotLike {
  id: string;
  startsAt: string;
  status: string;
}

export interface SlotDay<T extends SlotLike> {
  /** Local-day key, stable for React keys. */
  key: string;
  label: string;
  slots: T[];
}

const timeOf = (s: SlotLike) => new Date(s.startsAt).getTime();

export function groupSlotsByDay<T extends SlotLike>(slots: readonly T[]): SlotDay<T>[] {
  const days = new Map<string, SlotDay<T>>();
  for (const slot of [...slots].sort((a, b) => timeOf(a) - timeOf(b))) {
    const d = new Date(slot.startsAt);
    const key = d.toDateString();
    const day = days.get(key) ?? {
      key,
      label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      slots: [],
    };
    day.slots.push(slot);
    days.set(key, day);
  }
  return [...days.values()];
}

export function slotCounts(slots: readonly SlotLike[]): { open: number; total: number } {
  return { open: slots.filter((s) => s.status === 'available').length, total: slots.length };
}

export const formatSlotTime = (slot: Pick<SlotLike, 'startsAt'>): string =>
  new Date(slot.startsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const formatSlotDay = (slot: Pick<SlotLike, 'startsAt'>): string =>
  new Date(slot.startsAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
