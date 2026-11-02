/**
 * ScrimCalendarList
 *
 * The month as a plain agenda for phones: only days that have a match, in order.
 */

import { cn } from '@/lib/utils';
import type { CalendarDay } from '@/services/scrimCalendar';
import { MatchChip } from './ScrimCalendarGrid';

export function ScrimCalendarList({ weeks }: { weeks: CalendarDay[][] }) {
  const days = weeks.flat().filter((d) => d.inMonth && d.items.length > 0);
  if (days.length === 0) return null;

  return (
    <ul className="space-y-3 md:hidden" aria-label="Scrims this month">
      {days.map((day) => (
        <li key={day.date.toISOString()} className="rounded-xl border border-white/[0.08] bg-card p-3.5">
          <p className={cn('mb-2 text-[13px] font-semibold', day.isToday ? 'text-white' : 'text-zinc-300')}>
            {day.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            {day.isToday && <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-black">Today</span>}
          </p>
          <div className="space-y-1.5">
            {day.items.map((item) => <MatchChip key={item.id} item={item} />)}
          </div>
        </li>
      ))}
    </ul>
  );
}
