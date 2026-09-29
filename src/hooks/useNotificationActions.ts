import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { respondToOrgStaffInvite } from '@/lib/organizationStaff';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import type { Notification } from '@/contexts/notification-context';
import { isSyntheticNotification, resolveNotificationDestination } from '@/utils/notificationRegistry';

export type StaffInviteState = 'accepting' | 'declining' | 'accepted' | 'declined';

/**
 * Everything a notification surface can do: open, mark read, answer a staff
 * invite, delete. Shared by the bell sheet and the /notifications page so the
 * two never drift again. Deletes are optimistic and roll back on failure.
 */
export function useNotificationActions({ onNavigate }: { onNavigate?: () => void } = {}) {
  const ctx = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  const [staffInvites, setStaffInvites] = useState<Record<string, StaffInviteState>>({});

  const notifications = useMemo(
    () => ctx.notifications.filter((n) => !hiddenIds.has(n.id)),
    [ctx.notifications, hiddenIds],
  );

  const markRead = useCallback(async (n: Notification) => {
    if (!n.is_read) await ctx.markAsRead(n.id);
  }, [ctx]);

  const open = useCallback(async (n: Notification) => {
    void markRead(n);
    const destination = await resolveNotificationDestination(n);
    if (!destination) return;
    onNavigate?.();
    navigate(destination);
  }, [markRead, navigate, onNavigate]);

  const respondToStaffInvite = useCallback(async (n: Notification, accept: boolean) => {
    const staffId = typeof n.data?.organization_staff_id === 'string' ? n.data.organization_staff_id : null;
    if (!staffId || !user?.id) return;
    setStaffInvites((s) => ({ ...s, [n.id]: accept ? 'accepting' : 'declining' }));
    try {
      await respondToOrgStaffInvite({ inviteId: staffId, accept, userId: user.id });
      setStaffInvites((s) => ({ ...s, [n.id]: accept ? 'accepted' : 'declined' }));
      await markRead(n);
      const org = typeof n.data?.org_name === 'string' ? n.data.org_name : 'the organization';
      toast({
        title: accept ? `You joined ${org}` : 'Invitation declined',
        description: accept ? 'Opening your staff dashboard.' : 'They’ll need to invite you again if you change your mind.',
      });
      if (accept) {
        onNavigate?.();
        navigate('/staff/dashboard');
      }
      void ctx.refreshNotifications();
    } catch (err) {
      setStaffInvites((s) => {
        const next = { ...s };
        delete next[n.id];
        return next;
      });
      toast({
        title: 'Couldn’t answer the invitation',
        description: err instanceof Error ? err.message : 'Check your connection and try again.',
        variant: 'destructive',
      });
    }
  }, [ctx, markRead, navigate, onNavigate, toast, user?.id]);

  const remove = useCallback(async (ids: string[]) => {
    const deletable = ids.filter((id) => !isSyntheticNotification(id));
    if (deletable.length === 0) return false;
    setHiddenIds((prev) => new Set([...prev, ...deletable]));
    try {
      if (deletable.length === 1) await apiClient.delete(`/api/notifications/${deletable[0]}`);
      else await apiClient.post('/api/notifications/bulk-delete', { ids: deletable });
      await ctx.refreshNotifications();
      toast({ title: deletable.length === 1 ? 'Notification deleted' : `${deletable.length} notifications deleted` });
      return true;
    } catch {
      setHiddenIds((prev) => new Set([...prev].filter((id) => !deletable.includes(id))));
      toast({ title: 'Couldn’t delete', description: 'Nothing was removed. Try again.', variant: 'destructive' });
      return false;
    }
  }, [ctx, toast]);

  const markManyRead = useCallback(async (ids: string[]) => {
    const unread = notifications.filter((n) => ids.includes(n.id) && !n.is_read);
    await Promise.all(unread.map((n) => ctx.markAsRead(n.id)));
  }, [ctx, notifications]);

  return {
    notifications,
    unreadCount: ctx.unreadCount,
    isLoading: ctx.isLoading,
    hasError: ctx.hasError,
    refresh: ctx.refreshNotifications,
    markAllRead: ctx.markAllAsRead,
    markRead,
    markManyRead,
    open,
    respondToStaffInvite,
    staffInvites,
    remove,
  };
}

export type NotificationActions = ReturnType<typeof useNotificationActions>;
