import { CHART } from './chartTheme';
import { coachGroups, type CoachView } from '@/services/scrimInsights/coach';
import { rateText } from '@/services/scrimInsights/present';
import { EYEBROW_CLASS } from '@/components/ui/kit';

/** The questions a coach asks of a set of rounds, with the answer and the sample behind it: what decided rounds, not an average of everything. */
export function CoachPanel({ view, title = 'What decided rounds' }: { view: CoachView; title?: string }) {
  const groups = coachGroups(view);
  if (groups.length === 0) return null;
  return (
    <section aria-label={title} className="border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS}>{title}</h3>
      <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">Each line is rounds won out of rounds where the situation came up. The tick marks 50%. A line with no rounds behind it is left out.</p>
      <div className="mt-4 grid gap-x-8 gap-y-6 lg:grid-cols-2">
        {groups.map((g) => (
          <div key={g.title}>
            <h4 className="border-b border-white/[0.08] pb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{g.title}</h4>
            <ul className="mt-2 space-y-3">
              {g.rows.map((r) => (
                <li key={r.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-[13px] text-zinc-100">{r.label}</span>
                    <span className="shrink-0 text-[13px] font-bold tabular-nums text-white">{rateText(r.rate)}</span>
                  </div>
                  <p className="text-[11px] leading-snug text-zinc-500">{r.help}</p>
                  <div className="relative mt-1 h-1.5 bg-white/[0.06]" aria-hidden>
                    <div className="h-full" style={{ width: `${r.rate.pct ?? 0}%`, background: CHART.you }} />
                    <div className="absolute inset-y-0 left-1/2 w-px bg-white/50" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
