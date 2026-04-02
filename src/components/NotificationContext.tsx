import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    // Poll every 60s for new notifications (SignalR handles real-time)
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
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
      await apiClient.put(`/api/notifications/${id}/read`, {});
    } catch {
      // Non-critical
    }
  };

  const markAllAsRead = async () => {
    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await apiClient.put('/api/notifications/read-all', {});
    } catch {
      // Non-critical
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
