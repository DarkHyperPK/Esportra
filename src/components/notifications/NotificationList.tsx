import { useMemo, type ReactNode } from 'react';
import { BellOff } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS, InlineNotice } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import type { Notification } from '@/contexts/notification-context';
import { groupNotificationsByDay } from '@/utils/notificationRegistry';

interface NotificationListProps {
  items: Notification[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  empty: { title: string; body: string };
  density?: 'compact' | 'comfortable';
  /** Background of the sticky day headers; must match the surface behind the list. */
  headerBgClass?: string;
  renderItem: (n: Notification) => ReactNode;
  /** Unread act-now items shown above the feed as larger cards. */
  priority?: Notification[];
  renderPriority?: (n: Notification) => ReactNode;
}

function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading notifications">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex gap-3 border-b border-white/[0.05] px-5 py-4">
          <span className="h-11 w-11 shrink-0 bg-white/[0.05]" />
          <span className="flex-1 space-y-2 pt-0.5">
            <span className="block h-2 w-20 bg-white/[0.05]" />
            <span className="block h-3 w-3/4 bg-white/[0.07]" />
            <span className="block h-3 w-1/2 bg-white/[0.04]" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Day-grouped list with designed loading, error and empty states. */
export function NotificationList({
  items, isLoading, hasError, onRetry, empty, density = 'comfortable', headerBgClass = 'bg-background', renderItem, priority = [], renderPriority,
}: NotificationListProps) {
  const groups = useMemo(() => groupNotificationsByDay(items), [items]);

  if (isLoading && items.length === 0 && priority.length === 0) return <Skeleton rows={density === 'compact' ? 6 : 5} />;

  return (
    <div>
      {hasError && (
        <InlineNotice
          tone="critical"
          title="Couldn’t load notifications"
          className="m-4"
          action={<CommandButton variant="ghost" size="sm" onClick={onRetry}>Try again</CommandButton>}
        >
          {items.length > 0 ? 'Showing what we had last time.' : 'Check your connection and try again.'}
        </InlineNotice>
      )}

      {priority.length > 0 && renderPriority && (
        <section aria-label="Act now" className={cn('border-b border-white/[0.07]', density === 'compact' ? 'px-4 py-4' : 'px-5 py-5')}>
          <h3 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-white">
            Act now
            <span className="bg-white px-1.5 py-px tabular-nums text-matte-black">{priority.length}</span>
          </h3>
          <div className="space-y-3">{priority.map((n) => renderPriority(n))}</div>
        </section>
      )}

      {items.length === 0 && priority.length > 0 ? null : items.length === 0 && !hasError ? (
        <div className="flex flex-col items-start px-6 py-14 sm:px-8">
          <span className="flex h-10 w-10 items-center justify-center border border-white/10 text-zinc-500">
            <BellOff className="h-4 w-4" aria-hidden />
          </span>
          <p className="mt-5 font-heading text-lg font-bold text-white">{empty.title}</p>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-400">{empty.body}</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} aria-label={g.label}>
            <h3 className={cn('sticky top-0 z-10 border-b border-white/[0.05] px-5 py-2 backdrop-blur-md', headerBgClass, EYEBROW_CLASS)}>
              {g.label}
            </h3>
            <ul>{g.items.map((n) => renderItem(n))}</ul>
          </section>
        ))
      )}
    </div>
  );
}
