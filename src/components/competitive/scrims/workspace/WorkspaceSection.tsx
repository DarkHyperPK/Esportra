import type { ReactNode } from 'react';
import { EYEBROW_CLASS } from '@/components/ui/kit';
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

/** A labelled region of the workspace: eyebrow title, optional count and action. */
export function WorkspaceSection({ id, title, count, action, children, className }: WorkspaceSectionProps) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${id}-title`} className={cn(EYEBROW_CLASS, 'flex items-center gap-2')}>
          {title}
          {count !== undefined && count > 0 && (
            <span className="tabular-nums text-white/70">{count}</span>
          )}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
