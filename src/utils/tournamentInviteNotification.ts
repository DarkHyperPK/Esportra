import type { Notification } from '@/contexts/notification-context';

export interface TournamentInviteNotificationData {
  tournament_id?: string;
  invite_id?: string;
  code?: string;
  tournament_name?: string;
  game?: string;
  expires_at?: string;
}

export function getTournamentInviteFromNotification(
  notification: Notification,
): (Notification & { data: TournamentInviteNotificationData }) | null {
  if (notification.type !== 'tournament_invite') return null;

  const data = notification.data as TournamentInviteNotificationData | undefined;
  if (!data?.code) return null;

  return { ...notification, data };
}

export function buildRedeemInvitePath(code: string, tournamentKey?: string | null): string {
  const params = new URLSearchParams({ code });
  if (tournamentKey) {
    params.set('tournament', tournamentKey);
  }
  return `/invitations/redeem?${params.toString()}`;
}

export function findNextUnreadTournamentInvite(
  notifications: Notification[],
  dismissedIds: ReadonlySet<string>,
): Notification | null {
  const candidates = notifications
    .filter((notification) => {
      if (notification.is_read || dismissedIds.has(notification.id)) return false;
      return getTournamentInviteFromNotification(notification) !== null;
    })
    .sort(
      (left, right) =>
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
    );

  return candidates[0] ?? null;
}
