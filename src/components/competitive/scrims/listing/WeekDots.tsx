/**
 * WeekDots
 *
 * Availability as a Monday-first week: seven squares, the chosen days lit.
 * Reads at a glance where chips of "Mon Wed Fri" need parsing.
 */

import { cn } from '@/lib/utils';
import { weekFlags } from '@/services/scrimListingView';

interface WeekDotsProps {
  days: number[] | null | undefined;
  /** Rounded squares, for the soft-cornered listing cards. */
  soft?: boolean;
  className?: string;
}

export function WeekDots({ days, soft = false, className }: WeekDotsProps) {
  const week = weekFlags(days);
  const active = week.filter((d) => d.active).map((d) => d.name);

  return (
    <div
      role="img"
      aria-label={active.length > 0 ? `Available ${active.join(', ')}` : 'No days set'}
      className={cn('flex gap-1', className)}
    >
      {week.map((d, i) => (
        <span
          key={`${d.name}-${i}`}
          title={d.name}
          aria-hidden="true"
          className={cn(
            'flex h-[22px] w-[22px] items-center justify-center border font-mono text-[10px] font-semibold',
            soft && 'rounded-md',
            d.active
              ? 'border-white/30 bg-white/[0.14] text-white'
              : 'border-white/[0.06] text-zinc-600',
          )}
        >
          {d.label}
        </span>
      ))}
    </div>
  );
}
