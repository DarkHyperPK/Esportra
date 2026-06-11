import React, { useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { useHub } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';
import { NotificationContext, type Notification } from '@/contexts/notification-context';

export type { Notification };

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading, profile } = useAuth();
  const hub = useHub(HubPaths.Notification, { autoStart: !!user && !authLoading && !profile?.is_suspended });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const listenersAttached = useRef(false);

  const userId = user?.id;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const data = await apiClient.get<{
        notifications: Notification[];
        invites: Array<{ id: string; team_id: string; created_at: string; message?: string }>;
      }>('/api/notifications');

      const base: Notification[] = data.notifications || [];
      const synthetic: Notification[] = (data.invites || []).map((inv) => ({
        id: `invite-${inv.id}`,
        user_id: userId,
        type: 'team_invite',
        title: 'Team Invitation',
        message: inv.message || 'You have been invited to join a team',
        team_id: inv.team_id,
        is_read: false,
        link: '/player/teams',
        created_at: inv.created_at,
      }));

      const merged = [...synthetic, ...base].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setNotifications(merged);
      setUnreadCount(merged.filter(n => !n.is_read).length);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[Notifications] Fetch failed:', error);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !hub || authLoading || listenersAttached.current) return;

    const onNewNotification = (payload: Record<string, unknown>) => {
      const data = payload.data as Record<string, unknown> | undefined;
      const stub: Notification = {
        id: typeof payload.id === 'string' ? payload.id : crypto.randomUUID(),
        user_id: userId,
        type: typeof payload.type === 'string' ? payload.type : 'general',
        title: typeof payload.title === 'string' ? payload.title : 'New Notification',
        message: typeof payload.message === 'string' ? payload.message : '',
        link: typeof payload.link === 'string' ? payload.link : undefined,
        data,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setNotifications(prev => [stub, ...prev]);
      setUnreadCount(prev => prev + 1);

      if (stub.type === 'tournament_invite') {
        void fetchNotifications();
      }
    };

    const onNewNotificationRead = (notificationId: string) => {
      setNotifications(prev => {
        const updated = prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n);
        setUnreadCount(updated.filter(n => !n.is_read).length);
        return updated;
      });
    };

    const onAllRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    };

    hub.on('NewNotification', onNewNotification);
    hub.on('NotificationRead', onNewNotificationRead);
    hub.on('AllRead', onAllRead);
    listenersAttached.current = true;

    return () => {
      hub.off('NewNotification', onNewNotification);
      hub.off('NotificationRead', onNewNotificationRead);
      hub.off('AllRead', onAllRead);
      listenersAttached.current = false;
    };
  }, [userId, hub, authLoading, fetchNotifications]);

  useEffect(() => {
    if (authLoading) return;
    if (!userId || profile?.is_suspended) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
  }, [userId, fetchNotifications, authLoading, profile?.is_suspended]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, is_read: true } : n);
      setUnreadCount(updated.filter(n => !n.is_read).length);
      return updated;
    });

    if (String(id).startsWith('invite-')) return;

    try {
      if (hub.state === HubConnectionState.Connected) {
        await hub.invoke('MarkRead', id);
      } else {
        await apiClient.put(`/api/notifications/${id}/read`, {});
      }
    } catch {
      // Non-critical — optimistic update already applied
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      if (hub.state === HubConnectionState.Connected) {
        await hub.invoke('MarkAllRead');
      } else {
        await apiClient.put('/api/notifications/read-all', {});
      }
    } catch {
      // Non-critical — optimistic update already applied
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications: fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
