import { EYEBROW_CLASS } from '@/components/ui/kit';
import { monthLabel } from '@/services/career/format';
import type { MonthLine } from '@/types/career';

const MONTHS_SHOWN = 12;

/** Games per month, newest on the right. Plain bars: the number is in the label, so colour is not the message. */
export function ActivityBars({ activity }: { activity: MonthLine[] }) {
  const months = activity.slice(-MONTHS_SHOWN);
  if (months.length === 0) return null;
  const peak = Math.max(...months.map((m) => m.matches), 1);

  return (
    <section aria-label="Activity" className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <h3 className={EYEBROW_CLASS}>Activity · games per month</h3>
      <ul className="mt-4 flex h-24 items-end gap-1.5">
        {months.map((m) => (
          <li key={m.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            aria-label={`${monthLabel(m.month)}: ${m.matches} ${m.matches === 1 ? 'game' : 'games'}, ${m.wins} won`}>
            <span className="text-[10px] tabular-nums text-zinc-500">{m.matches}</span>
            <span aria-hidden className="w-full rounded-sm bg-rose-500/70" style={{ height: `${Math.max(6, (m.matches / peak) * 100)}%` }} />
            <span aria-hidden className="text-[10px] text-zinc-600">{monthLabel(m.month)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
