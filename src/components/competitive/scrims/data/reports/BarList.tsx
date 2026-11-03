import { CHART } from './chartTheme';

export interface BarItem { label: string; value: number | null; valueText: string; sub?: string; color?: string; icon?: string }

/** Horizontal bars on a 0-100 scale (or `max`), each with its value written out. A missing value is a dash with no bar, never an empty bar. */
export function BarList({ items, max = 100, reference }: { items: BarItem[]; max?: number; reference?: number }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 text-zinc-200">
              {it.icon && <img src={it.icon} alt="" className="h-5 w-5 shrink-0 rounded-sm" loading="lazy" />}
              <span className="truncate">{it.label}</span>
              {it.sub && <span className="shrink-0 text-[11px] text-zinc-500">{it.sub}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-white">{it.valueText}</span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-[4px] bg-white/[0.06]" aria-hidden>
            {it.value != null && <div className="h-full rounded-[4px]" style={{ width: `${Math.max(0, Math.min(100, (it.value / max) * 100))}%`, background: it.color ?? CHART.you }} />}
            {reference != null && <div className="absolute inset-y-0 w-px bg-white/40" style={{ left: `${(reference / max) * 100}%` }} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
