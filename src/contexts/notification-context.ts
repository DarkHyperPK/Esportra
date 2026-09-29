import { createContext } from 'react';

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
  data?: Record<string, unknown>;
  created_at: string;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  /** True until the first fetch for the signed-in user settles. */
  isLoading: boolean;
  /** The last fetch failed; the list may be stale or empty. */
  hasError: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
