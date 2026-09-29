import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { NotificationFilters, type NotificationFilterOption } from '@/components/notifications/NotificationFilters';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationList } from '@/components/notifications/NotificationList';
import { useNotificationActions } from '@/hooks/useNotificationActions';
import { NotificationPriorityCard } from '@/components/notifications/NotificationPriorityCard';
import { isPriorityNotification } from '@/utils/notificationSubject';
import { CATEGORY_LABELS, getNotificationKind, isSyntheticNotification, type NotificationCategory } from '@/utils/notificationRegistry';

const FILTER_CATEGORIES: NotificationCategory[] = ['matches', 'teams', 'tournaments', 'disputes'];

const NotificationsPage = () => {
  const actions = useNotificationActions();
  const { notifications, unreadCount } = actions;
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const options = useMemo<NotificationFilterOption[]>(() => [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread', count: unreadCount },
    ...FILTER_CATEGORIES.map((c) => ({
      value: c,
      label: CATEGORY_LABELS[c],
      count: notifications.filter((n) => !n.is_read && getNotificationKind(n.type).category === c).length,
    })),
  ], [notifications, unreadCount]);

  const visible = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.is_read);
    return notifications.filter((n) => getNotificationKind(n.type).category === filter);
  }, [filter, notifications]);
  const priority = useMemo(() => visible.filter(isPriorityNotification), [visible]);
  const items = useMemo(() => visible.filter((n) => !isPriorityNotification(n)), [visible]);

  const selectedIds = [...selected].filter((id) => items.some((n) => n.id === id));
  const deletableCount = selectedIds.filter((id) => !isSyntheticNotification(id)).length;
  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  const clear = () => setSelected(new Set());

  const empty = filter === 'unread'
    ? { title: 'No unread notifications', body: 'You’ve seen everything. Switch to All for your history.' }
    : filter === 'all'
      ? { title: 'You’re all caught up', body: 'Match times, results, team invites and announcements show up here as they happen.' }
      : { title: `Nothing in ${CATEGORY_LABELS[filter as NotificationCategory] ?? 'this filter'} yet`, body: 'Notifications of this kind will show up here.' };

  const deleteSelected = async () => {
    const ok = await actions.remove(selectedIds);
    setConfirmDelete(false);
    if (ok) clear();
  };

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6">
        <header className="flex flex-col gap-4 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={EYEBROW_CLASS}>Inbox</p>
            <h1 className="mt-2 font-heading text-3xl font-black tracking-tight">Notifications</h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
              Match times, results, invites and announcements for your teams and tournaments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <CommandButton variant="secondary" size="sm" slide onClick={() => void actions.markAllRead()}>
                Mark all read
              </CommandButton>
            )}
            <CommandButton variant="ghost" size="sm" asChild>
              <Link to="/account/settings">Settings</Link>
            </CommandButton>
          </div>
        </header>

        <NotificationFilters className="mt-5" options={options} value={filter} onChange={(v) => { setFilter(v); clear(); }} />

        <div className="mt-5 border border-white/[0.07] bg-card/40">
          <NotificationList
            items={items}
            priority={priority}
            renderPriority={(n) => (
              <NotificationPriorityCard
                key={n.id}
                notification={n}
                staffInvite={actions.staffInvites[n.id]}
                onOpen={(x) => void actions.open(x)}
                onMarkRead={(x) => void actions.markRead(x)}
                onRespondToStaffInvite={(x, accept) => void actions.respondToStaffInvite(x, accept)}
              />
            )}
            isLoading={actions.isLoading}
            hasError={actions.hasError}
            onRetry={() => void actions.refresh()}
            empty={empty}
            headerBgClass="bg-[#0d0d10]/95"
            renderItem={(n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                selectable
                selected={selected.has(n.id)}
                onSelectedChange={(on) => toggle(n.id, on)}
                staffInvite={actions.staffInvites[n.id]}
                onOpen={(x) => void actions.open(x)}
                onMarkRead={(x) => void actions.markRead(x)}
                onRespondToStaffInvite={(x, accept) => void actions.respondToStaffInvite(x, accept)}
                onDelete={isSyntheticNotification(n.id) ? undefined : (x) => void actions.remove([x.id])}
              />
            )}
          />
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="font-mono text-xs tabular-nums text-zinc-300">{selectedIds.length} selected</p>
            <div className="flex items-center gap-2">
              <CommandButton variant="ghost" size="sm" onClick={clear}>Clear</CommandButton>
              <CommandButton variant="secondary" size="sm" onClick={() => { void actions.markManyRead(selectedIds); clear(); }}>
                Mark read
              </CommandButton>
              <CommandButton variant="danger" size="sm" disabled={deletableCount === 0} onClick={() => setConfirmDelete(true)}>
                Delete
              </CommandButton>
            </div>
          </div>
        </div>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="font-heading text-lg">
              Delete {deletableCount} notification{deletableCount === 1 ? '' : 's'}?
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-400">
              This can’t be undone. Pending team invites stay until you answer them in Teams.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <CommandButton variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</CommandButton>
            <CommandButton variant="danger" size="sm" onClick={() => void deleteSelected()}>Delete</CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationsPage;
