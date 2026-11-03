import { AlertTriangle, Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportHighlight } from '@/types/scrimReport';

const TONE = {
  good: { Icon: Sparkles, ring: 'border-emerald-400/30 bg-emerald-400/[0.06]', icon: 'text-emerald-300', label: 'Strength' },
  watch: { Icon: AlertTriangle, ring: 'border-amber-400/30 bg-amber-400/[0.06]', icon: 'text-amber-300', label: 'Worth a look' },
  neutral: { Icon: Info, ring: 'border-white/10 bg-white/[0.03]', icon: 'text-zinc-400', label: 'Note' },
} as const;

/** What stands out, each with its evidence. Shown only where the sample supports it, so an empty row means nothing stood out yet. */
export function HighlightCards({ highlights }: { highlights: ReportHighlight[] }) {
  if (highlights.length === 0) return null;
  return (
    <ul aria-label="Highlights" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {highlights.map((h) => {
        const t = TONE[h.tone];
        return (
          <li key={`${h.kind}-${h.playerId ?? 'team'}`} className={cn('rounded-xl border p-3', t.ring)}>
            <p className={cn('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide', t.icon)}><t.Icon className="h-3.5 w-3.5" aria-hidden />{t.label}</p>
            <p className="mt-1 text-[14px] font-semibold text-white">{h.title}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-400">{h.detail}</p>
          </li>
        );
      })}
    </ul>
  );
}
