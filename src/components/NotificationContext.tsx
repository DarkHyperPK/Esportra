import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  reason?: string;
  link?: string;
  team_id?: string;
  is_read: boolean;
  data?: Record<string, any>;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const hub = useHub(HubPaths.Notification);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const listenersAttached = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const data = await apiClient.get<{
        notifications: Notification[];
        invites: Array<{ id: string; team_id: string; created_at: string; message?: string }>;
      }>('/api/notifications');

      const base: Notification[] = data.notifications || [];
      const synthetic: Notification[] = (data.invites || []).map((inv) => ({
        id: `invite-${inv.id}`,
        user_id: user.id,
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
      console.error('[Notifications] Fetch failed:', error);
    }
  }, [user]);

  // Wire up SignalR listeners (replaces polling)
  useEffect(() => {
    if (!user || !hub || listenersAttached.current) return;

    const onNewNotification = (payload: Record<string, string>) => {
      // Prepend new notification and bump unread count; full data comes from a re-fetch
      const stub: Notification = {
        id: payload.id ?? crypto.randomUUID(),
        user_id: user.id,
        type: payload.type ?? 'general',
        title: payload.title ?? 'New Notification',
        message: payload.message ?? '',
        link: payload.link,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setNotifications(prev => [stub, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const onNotificationRead = (notificationId: string) => {
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
    hub.on('NotificationRead', onNotificationRead);
    hub.on('AllRead', onAllRead);
    listenersAttached.current = true;

    return () => {
      hub.off('NewNotification', onNewNotification);
      hub.off('NotificationRead', onNotificationRead);
      hub.off('AllRead', onAllRead);
      listenersAttached.current = false;
    };
  }, [user, hub]);

  // Initial fetch on mount — one-time load of existing notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, is_read: true } : n);
      setUnreadCount(updated.filter(n => !n.is_read).length);
      return updated;
    });

    // Skip API call for synthetic invite notifications
    if (String(id).startsWith('invite-')) return;

    try {
      // Use SignalR for multi-tab sync when connected, fall back to REST
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
    // Optimistic
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

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
};
