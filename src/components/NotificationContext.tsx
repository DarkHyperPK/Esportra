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
  data?: Record<string, any>;
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

  type InviteRow = { id: string; team_id: string; created_at: string; message?: string; status?: string };

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
      .from('team_invitations')
      .select('id, team_id, created_at, message')
      .eq('invited_user_id', user.id)
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
      link: '/player/teams',
      created_at: inv.created_at,
    }));

    const merged = [...synthetic, ...base].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNotifications(merged);
    setUnreadCount(merged.filter(n => !n.is_read).length);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Initial fetch
    fetchNotifications();

    // Set up realtime subscriptions instead of polling
    const notificationsChannel = supabase
      .channel(`notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Notifications] Realtime update:', payload.eventType);

          if (payload.eventType === 'INSERT' && payload.new) {
            // New notification added
            const newNotification = payload.new as Notification;
            setNotifications(prev => {
              const exists = prev.some(n => n.id === newNotification.id);
              if (exists) return prev;
              const updated = [newNotification, ...prev].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              setUnreadCount(updated.filter(n => !n.is_read).length);
              return updated;
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            // Notification updated (e.g., marked as read)
            const updatedNotification = payload.new as Notification;
            setNotifications(prev => {
              const updated = prev.map(n => n.id === updatedNotification.id ? updatedNotification : n);
              setUnreadCount(updated.filter(n => !n.is_read).length);
              return updated;
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            // Notification deleted
            setNotifications(prev => {
              const updated = prev.filter(n => n.id !== payload.old.id);
              setUnreadCount(updated.filter(n => !n.is_read).length);
              return updated;
            });
          }
        }
      )
      .subscribe();

    const invitesChannel = supabase
      .channel(`team_invitations_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_invitations',
          filter: `invited_user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Notifications] Team invite update:', payload.eventType);

          // Update notifications state directly instead of refetching
          if (payload.eventType === 'INSERT' && payload.new) {
            const newInvite = payload.new as InviteRow;
            const syntheticNotification: Notification = {
              id: `invite-${newInvite.id}`,
              user_id: user.id,
              type: 'team_invite',
              title: 'Team Invitation',
              message: newInvite.message || `You have been invited to join a team`,
              team_id: newInvite.team_id,
              is_read: false,
              link: '/player/teams',
              created_at: newInvite.created_at,
            };

            setNotifications(prev => {
              const exists = prev.some(n => n.id === syntheticNotification.id);
              if (exists) return prev;
              const updated = [syntheticNotification, ...prev].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              setUnreadCount(updated.filter(n => !n.is_read).length);
              return updated;
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedInvite = payload.new as InviteRow;
            // If invite is no longer pending, remove the synthetic notification
            if (updatedInvite.status !== 'pending') {
              setNotifications(prev => {
                const updated = prev.filter(n => n.id !== `invite-${updatedInvite.id}`);
                setUnreadCount(updated.filter(n => !n.is_read).length);
                return updated;
              });
            } else {
              // Update existing synthetic notification
              const syntheticNotification: Notification = {
                id: `invite-${updatedInvite.id}`,
                user_id: user.id,
                type: 'team_invite',
                title: 'Team Invitation',
                message: updatedInvite.message || `You have been invited to join a team`,
                team_id: updatedInvite.team_id,
                is_read: false,
                link: '/player/teams',
                created_at: updatedInvite.created_at,
              };

              setNotifications(prev => {
                const updated = prev.map(n =>
                  n.id === syntheticNotification.id ? syntheticNotification : n
                );
                setUnreadCount(updated.filter(n => !n.is_read).length);
                return updated;
              });
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedInvite = payload.old as InviteRow;
            // Remove synthetic notification
            setNotifications(prev => {
              const updated = prev.filter(n => n.id !== `invite-${deletedInvite.id}`);
              setUnreadCount(updated.filter(n => !n.is_read).length);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      notificationsChannel.unsubscribe();
      invitesChannel.unsubscribe();
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    // Update in database - realtime subscription will handle state update
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    // No need to call fetchNotifications - realtime UPDATE event will update state
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
