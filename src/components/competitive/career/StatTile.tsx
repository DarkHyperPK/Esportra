import { cn } from '@/lib/utils';
import { EYEBROW_CLASS } from '@/components/ui/kit';

interface Props {
  label: string;
  value: string;
  /** How the figure is worked out, in a few words. Shown, not hidden in a tooltip. */
  hint: string;
  className?: string;
}

/** One figure with its definition underneath, so nobody has to guess what it means. */
export function StatTile({ label, value, hint, className }: Props) {
  return (
    <div className={cn('rounded-xl border border-white/5 bg-white/[0.02] p-4', className)}>
      <p className={EYEBROW_CLASS}>{label}</p>
      <p className="mt-1.5 font-heading text-2xl font-bold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-zinc-500">{hint}</p>
    </div>
  );
}
