import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import { useNotificationActions } from '@/hooks/useNotificationActions';
import { NotificationList } from './NotificationList';
import { NotificationItem } from './NotificationItem';
import { NotificationFilters } from './NotificationFilters';
import { NotificationPriorityCard } from './NotificationPriorityCard';
import { isPriorityNotification } from '@/utils/notificationSubject';

/**
 * The bell and its inbox sheet. Opening it no longer marks everything read:
 * items stay highlighted until opened or until "Mark all read".
 */
export const NotificationSidebar = ({ className }: { className?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const actions = useNotificationActions({ onNavigate: () => setIsOpen(false) });
  const { notifications, unreadCount } = actions;

  const { priority, items } = useMemo(() => {
    const visible = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;
    return { priority: visible.filter(isPriorityNotification), items: visible.filter((n) => !isPriorityNotification(n)) };
  }, [filter, notifications]);
  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className={cn(
            'relative inline-flex h-10 w-10 items-center justify-center border border-white/10 bg-white/[0.03] text-zinc-300 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            className,
          )}
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden />
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center bg-rose-500 px-1 font-mono text-[10px] font-bold tabular-nums text-white"
            >
              {badge}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-white/10 bg-background p-0 sm:max-w-[440px] [&>button]:rounded-none [&>button]:border [&>button]:border-white/10 [&>button]:p-1 [&>button:focus]:!ring-offset-0 [&>button:focus]:!ring-white/40 [&>button]:data-[state=open]:bg-transparent"
      >
        <header className="border-b border-white/[0.07] px-5 pb-4 pt-5">
          <p className={EYEBROW_CLASS}>Inbox</p>
          <div className="mt-2 flex items-baseline gap-3 pr-10">
            <SheetTitle className="font-heading text-xl font-bold tracking-tight text-white">Notifications</SheetTitle>
            <span className="font-mono text-xs tabular-nums text-zinc-400">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
            </span>
          </div>
          <SheetDescription className="sr-only">Match times, results, invites and announcements.</SheetDescription>
          <div className="mt-4 flex items-center justify-between gap-3">
            <NotificationFilters
              value={filter}
              onChange={(v) => setFilter(v === 'unread' ? 'unread' : 'all')}
              options={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread', count: unreadCount }]}
            />
            {unreadCount > 0 && (
              <CommandButton variant="ghost" size="sm" onClick={() => void actions.markAllRead()}>Mark all read</CommandButton>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <NotificationList
            items={items}
            density="compact"
            priority={priority}
            renderPriority={(n) => (
              <NotificationPriorityCard
                key={n.id}
                notification={n}
                compact
                staffInvite={actions.staffInvites[n.id]}
                onOpen={(x) => void actions.open(x)}
                onMarkRead={(x) => void actions.markRead(x)}
                onRespondToStaffInvite={(x, accept) => void actions.respondToStaffInvite(x, accept)}
              />
            )}
            isLoading={actions.isLoading}
            hasError={actions.hasError}
            onRetry={() => void actions.refresh()}
            empty={
              filter === 'unread'
                ? { title: 'No unread notifications', body: 'You’ve seen everything. Older notifications are under All.' }
                : { title: 'You’re all caught up', body: 'Match times, results, team invites and announcements show up here as they happen.' }
            }
            renderItem={(n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                density="compact"
                staffInvite={actions.staffInvites[n.id]}
                onOpen={(x) => void actions.open(x)}
                onMarkRead={(x) => void actions.markRead(x)}
                onRespondToStaffInvite={(x, accept) => void actions.respondToStaffInvite(x, accept)}
              />
            )}
          />
        </div>

        <footer className="border-t border-white/[0.07] px-5 py-3">
          <Link
            to="/notifications"
            onClick={() => setIsOpen(false)}
            className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-300 transition-colors hover:text-white"
          >
            View all notifications →
          </Link>
        </footer>
      </SheetContent>
    </Sheet>
  );
};
