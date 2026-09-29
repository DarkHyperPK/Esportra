import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EYEBROW_CLASS, PANEL_CLASS } from './tone';

export interface SummaryRow {
  label: string;
  value: ReactNode;
  /** Shows the value quietly when it is still a default. */
  muted?: boolean;
}

interface SummaryCardProps {
  eyebrow?: string;
  title: ReactNode;
  media?: ReactNode;
  rows: SummaryRow[];
  footer?: ReactNode;
  className?: string;
}

/**
 * A live preview of what the form will create. It sits beside the form on
 * desktop and updates as you type, so the result is never a surprise.
 */
export function SummaryCard({ eyebrow, title, media, rows, footer, className }: SummaryCardProps) {
  return (
    <aside className={cn(PANEL_CLASS, 'flex flex-col', className)}>
      <div className="flex items-center gap-4 border-b border-white/[0.06] p-5">
        {media}
        <div className="min-w-0">
          {eyebrow && <p className={EYEBROW_CLASS}>{eyebrow}</p>}
          <p className="mt-1 truncate font-heading text-lg font-bold text-white">{title}</p>
        </div>
      </div>
      <dl className="divide-y divide-white/[0.05] px-5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-xs text-zinc-500">{row.label}</dt>
            <dd className={cn('text-right text-sm', row.muted ? 'text-zinc-500' : 'text-zinc-100')}>{row.value}</dd>
          </div>
        ))}
      </dl>
      {footer && <div className="mt-auto border-t border-white/[0.06] p-5">{footer}</div>}
    </aside>
  );
}
