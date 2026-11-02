/**
 * scrimCalendar.ts
 *
 * Pure month-grid logic for the team's scrim calendar. Weeks start on Monday and
 * every day is a local day, so a 11pm match lands on the day the captain sees.
 */

import type { ScrimSessionStatus } from '@/types/competitive';

export interface CalendarSession {
  id: string;
  status: ScrimSessionStatus;
  scheduledAt: string | null;
  opponentName: string | null;
}

export interface CalendarItem {
  id: string;
  opponent: string;
  timeLabel: string;
  startsAt: number;
  /** Over: completed (or disputed, which is past play). */
  done: boolean;
  live: boolean;
}

export interface CalendarDay {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  items: CalendarItem[];
}

export interface MonthRef {
  year: number;
  /** 0-11 */
  month: number;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function toItem(s: CalendarSession): CalendarItem | null {
  if (!s.scheduledAt || s.status === 'cancelled') return null;
  const d = new Date(s.scheduledAt);
  if (Number.isNaN(d.getTime())) return null;
  return {
    id: s.id,
    opponent: s.opponentName ?? 'Opponent',
    timeLabel: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    startsAt: d.getTime(),
    done: s.status === 'completed' || s.status === 'disputed',
    live: s.status === 'in_progress',
  };
}

export function buildMonthGrid(year: number, month: number, sessions: readonly CalendarSession[], today: Date): CalendarDay[][] {
  const byDay = new Map<string, CalendarItem[]>();
  for (const s of sessions) {
    const item = toItem(s);
    if (!item) continue;
    const key = dayKey(new Date(item.startsAt));
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }

  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const todayKey = dayKey(today);

  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d): CalendarDay => {
      const date = new Date(year, month, 1 - offset + w * 7 + d);
      return {
        date,
        inMonth: date.getMonth() === month,
        isToday: dayKey(date) === todayKey,
        items: [...(byDay.get(dayKey(date)) ?? [])].sort((a, b) => a.startsAt - b.startsAt),
      };
    }),
  );
}

/** Accepted matches that still need a time agreed. */
export function unscheduledMatches<T extends CalendarSession>(sessions: readonly T[]): T[] {
  return sessions.filter((s) => s.status === 'scheduled' && !s.scheduledAt);
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const d = new Date(ref.year, ref.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function monthLabel(ref: MonthRef): string {
  return new Date(ref.year, ref.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
