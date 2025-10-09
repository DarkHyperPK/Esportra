import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  type InviteRow = { id: string; team_id: string; created_at: string; message?: string };

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    // Load stored notifications
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Also load pending team invites directly as synthetic notifications in case no row exists in notifications table
    const { data: invites } = await supabase
      .from('team_invites')
      .select('id, team_id, created_at, message')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    const base: Notification[] = (!error && data ? (data as Notification[]) : []) as Notification[];
    const synthetic: Notification[] = ((invites || []) as InviteRow[]).map((inv) => ({
      id: `invite-${inv.id}`,
      user_id: user.id,
      type: 'team_invite',
      title: 'Team Invitation',
      message: inv.message || `You have been invited to join a team`,
      team_id: inv.team_id,
      is_read: false,
      created_at: inv.created_at,
    }));

    const merged = [...synthetic, ...base].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNotifications(merged);
    setUnreadCount(merged.filter(n => !n.is_read).length);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    // Optionally, poll for new notifications every 30s
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    await fetchNotifications();
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, refreshNotifications: fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
}; 