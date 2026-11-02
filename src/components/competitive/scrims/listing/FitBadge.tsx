import { cn } from '@/lib/utils';
import type { FitLabel } from '@/services/scrimListingView';

/** "Good fit" / "Rank gap" / "Other region", measured against the viewer's own listing. */
export function FitBadge({ fit, soft = false }: { fit: FitLabel | null; soft?: boolean }) {
  if (!fit) return null;
  const good = fit.tone === 'success';
  return (
    <span
      className={cn(
        soft && 'rounded-full',
        'inline-flex items-center gap-1.5 border bg-black/60 px-2 py-1 text-[11px] font-medium',
        good ? 'border-emerald-400/30 text-emerald-300' : 'border-amber-400/30 text-amber-200',
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', good ? 'bg-emerald-400' : 'bg-amber-400')} />
      {fit.label}
    </span>
  );
}
