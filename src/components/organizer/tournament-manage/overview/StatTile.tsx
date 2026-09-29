import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EYEBROW_CLASS } from '../tone';

interface StatTileProps {
  label: string;
  value: ReactNode;
  suffix?: ReactNode;
  hint?: ReactNode;
  /** 0–100; draws a thin fill bar under the value. */
  progress?: number | null;
  emphasis?: boolean;
  className?: string;
}

export function StatTile({ label, value, suffix, hint, progress, emphasis = false, className }: StatTileProps) {
  return (
    <div className={cn('flex min-w-0 flex-col justify-between gap-3 p-5', className)}>
      <p className={EYEBROW_CLASS}>{label}</p>
      <div>
        <p className="flex items-baseline gap-1 tabular-nums text-white">
          <span className={cn('whitespace-nowrap font-heading font-black tracking-tight', emphasis ? 'text-5xl' : 'text-xl sm:text-2xl')}>{value}</span>
          {suffix && <span className="text-lg font-medium text-zinc-600">{suffix}</span>}
        </p>
        {progress != null && (
          <div className="mt-3 h-1 w-full bg-white/[0.06]" role="presentation">
            <div
              className="h-full bg-rose-500 transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        )}
        {hint && <p className="mt-2 text-xs text-zinc-500">{hint}</p>}
      </div>
    </div>
  );
}
