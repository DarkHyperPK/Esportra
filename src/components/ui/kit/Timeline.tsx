import { cn } from '@/lib/utils';
import { EYEBROW_CLASS } from './tone';

export interface TimelineItem {
  label: string;
  value: string;
  /** The moment everything leads to (usually the start). */
  emphasis?: boolean;
}

interface TimelineProps {
  title?: string;
  items: TimelineItem[];
  className?: string;
}

/** Ordered moments drawn as a line, so the sequence reads at a glance. */
export function Timeline({ title, items, className }: TimelineProps) {
  return (
    <div className={className}>
      {title && <p className={cn(EYEBROW_CLASS, 'mb-4')}>{title}</p>}
      <ol className="relative space-y-4 border-l border-white/10 pl-5">
        {items.map((item) => (
          <li key={item.label} className="relative">
            <span
              aria-hidden
              className={cn(
                'absolute -left-[25px] top-1.5 h-2 w-2',
                item.emphasis ? 'bg-rose-500 ring-4 ring-rose-500/15' : 'bg-zinc-600',
              )}
            />
            <p className={cn('text-xs', item.emphasis ? 'text-rose-300' : 'text-zinc-500')}>{item.label}</p>
            <p className={cn('text-sm', item.emphasis ? 'font-semibold text-white' : 'text-zinc-200')}>{item.value}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
