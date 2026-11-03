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
    <div title={hint} className={cn('rounded-none border border-white/[0.06] bg-[#111114] p-4', className)}>
      <p className={EYEBROW_CLASS}>{label}</p>
      <p className="mt-1.5 font-heading text-2xl font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}
