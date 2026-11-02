/**
 * ScrimCalendarGrid
 *
 * A Monday-first month grid of accepted scrims. Desktop and tablet only; on a
 * phone the same data is shown as ScrimCalendarList.
 */

import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { CalendarDay, CalendarItem } from '@/services/scrimCalendar';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_VISIBLE = 3;

export function MatchChip({ item, stacked = false }: { item: CalendarItem; stacked?: boolean }) {
  return (
    <Link
      to={`/competitive/scrims/sessions/${item.id}`}
      className={cn(
        'flex rounded-md border px-1.5 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        item.live
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15'
          : item.done
            ? 'border-white/[0.06] bg-transparent text-zinc-500 hover:text-zinc-300'
            : 'border-white/[0.12] bg-white/[0.06] text-white hover:bg-white/[0.1]',
      )}
      title={`${item.timeLabel} vs ${item.opponent}`}
    >
      <span className={cn('flex min-w-0 gap-x-1.5', stacked ? 'flex-col' : 'items-center')}>
        <span className="shrink-0 tabular-nums text-white/60">{item.timeLabel}</span>
        <span className="truncate font-medium">{item.opponent}</span>
      </span>
    </Link>
  );
}

function DayCell({ day }: { day: CalendarDay }) {
  const extra = day.items.length - MAX_VISIBLE;
  return (
    <div role="gridcell" className={cn('min-h-[112px] space-y-1 p-2', day.inMonth ? 'bg-card' : 'bg-[#0c0c0e]')}>
      <p
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full text-[12px] tabular-nums',
          day.isToday ? 'bg-white font-semibold text-black' : day.inMonth ? 'text-zinc-300' : 'text-zinc-600',
        )}
        aria-label={day.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      >
        {day.date.getDate()}
      </p>
      <div className="space-y-1">
        {day.items.slice(0, MAX_VISIBLE).map((item) => <MatchChip key={item.id} item={item} stacked />)}
        {extra > 0 && <p className="px-1 text-[11px] text-zinc-500">+{extra} more</p>}
      </div>
    </div>
  );
}

export function ScrimCalendarGrid({ weeks }: { weeks: CalendarDay[][] }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-white/[0.08] md:block" role="grid" aria-label="Scrim calendar">
      <div className="grid grid-cols-7 gap-px bg-white/[0.08]">
        {WEEKDAYS.map((d) => (
          <p key={d} role="columnheader" className="bg-card px-3 py-2.5 text-[12px] font-medium text-zinc-500">{d}</p>
        ))}
        {weeks.flat().map((day) => <DayCell key={day.date.toISOString()} day={day} />)}
      </div>
    </div>
  );
}
