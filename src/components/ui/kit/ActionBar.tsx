import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ActionBarProps {
  /** Back / secondary actions. */
  start?: ReactNode;
  /** Quiet status such as "Saved on this device". Hidden on small screens. */
  status?: ReactNode;
  /** The one primary action, plus at most one secondary. */
  end: ReactNode;
  /** Stick to the bottom of the viewport (long forms). */
  sticky?: boolean;
  className?: string;
}

/**
 * Where a step ends. Back on the left, the next step on the right, status in
 * between. Sticky on long forms so the next move is always in reach.
 */
export function ActionBar({ start, status, end, sticky = false, className }: ActionBarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3',
        sticky && 'sticky bottom-0 z-30 -mx-4 border-t border-white/10 bg-background/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:px-0',
        className,
      )}
    >
      {start && <div className="flex items-center gap-2">{start}</div>}
      <div className="flex flex-1 items-center justify-end gap-4 [&>button:last-child]:flex-1 sm:[&>button:last-child]:flex-none">
        {status && <span className="hidden text-xs text-zinc-500 md:inline">{status}</span>}
        {end}
      </div>
    </div>
  );
}
