import { cn } from '@/lib/utils';
import type { ReportHighlight } from '@/types/scrimReport';

const TONE = {
  good: { rule: 'border-[#34d399]', tag: 'text-[#34d399]', label: 'Working' },
  watch: { rule: 'border-[#fbbf24]', tag: 'text-[#fbbf24]', label: 'Look at' },
  neutral: { rule: 'border-white/20', tag: 'text-zinc-400', label: 'Note' },
} as const;

/** What stands out, each with its evidence. Shown only where the sample supports it, so an empty row means nothing stood out yet. */
export function HighlightCards({ highlights }: { highlights: ReportHighlight[] }) {
  if (highlights.length === 0) return null;
  return (
    <ul aria-label="Highlights" className="grid gap-px border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
      {highlights.map((h) => {
        const t = TONE[h.tone];
        return (
          <li key={`${h.kind}-${h.playerId ?? 'team'}`} className={cn('border-l-2 bg-[#111114] p-3', t.rule)}>
            <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', t.tag)}>{t.label}</p>
            <p className="mt-1 text-[14px] font-bold text-white">{h.title}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-400">{h.detail}</p>
          </li>
        );
      })}
    </ul>
  );
}
