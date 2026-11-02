import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WorkspaceSectionProps {
  id: string;
  title: string;
  /** Shown beside the title, e.g. how many items. */
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A labelled region of the workspace: title, optional count and action. */
export function WorkspaceSection({ id, title, count, action, children, className }: WorkspaceSectionProps) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="flex scroll-mt-6 items-center gap-2 font-heading text-[16px] font-semibold text-white">
          {title}
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-white/[0.08] px-2 py-0.5 font-sans text-[11px] font-medium tabular-nums text-zinc-300">{count}</span>
          )}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
