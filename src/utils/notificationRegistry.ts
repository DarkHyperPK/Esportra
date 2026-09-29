import {
  AlertTriangle, Bell, Calendar, CheckCircle2, Crown, FileText, Info, Map as MapIcon, Megaphone,
  Shield, ShieldAlert, Swords, Ticket, Trophy, UserMinus, Users, XCircle, type LucideIcon,
} from 'lucide-react';
import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import type { Tone } from '@/components/ui/kit/tone';
import type { Notification } from '@/contexts/notification-context';
import { resolveCaptainMatchNotificationLinkAsync } from '@/utils/notificationLinks';
import { buildRedeemInvitePath, getTournamentInviteFromNotification } from '@/utils/tournamentInviteNotification';

export type NotificationCategory = 'matches' | 'disputes' | 'teams' | 'tournaments' | 'staff' | 'system';

export interface NotificationKind {
  icon: LucideIcon;
  /** Colour is meaning: accent = act now, critical/warning/success = outcome, neutral = information. */
  tone: Tone;
  category: NotificationCategory;
  /** Short mono caption shown above the title. */
  label: string;
}

const kind = (icon: LucideIcon, tone: Tone, category: NotificationCategory, label: string): NotificationKind => ({ icon, tone, category, label });

/** Every notification type the app sends or receives. One place for icon, tone, category and caption. */
export const NOTIFICATION_KINDS: Record<string, NotificationKind> = {
  // Matches
  match_ready: kind(Swords, 'accent', 'matches', 'Match ready'),
  veto_your_turn: kind(Swords, 'accent', 'matches', 'Your turn'),
  veto_completed: kind(MapIcon, 'neutral', 'matches', 'Map veto'),
  match_schedule_changed: kind(Calendar, 'neutral', 'matches', 'Schedule'),
  br_game_schedule_changed: kind(Calendar, 'neutral', 'matches', 'Schedule'),
  br_lobby_schedule_changed: kind(Calendar, 'neutral', 'matches', 'Schedule'),
  match_walkover: kind(Trophy, 'warning', 'matches', 'Walkover'),
  match_completed: kind(Trophy, 'success', 'matches', 'Result'),
  result_reported: kind(FileText, 'warning', 'matches', 'Result reported'),
  result_accepted: kind(CheckCircle2, 'success', 'matches', 'Result confirmed'),
  // Disputes
  result_disputed: kind(ShieldAlert, 'critical', 'disputes', 'Disputed'),
  dispute_filed: kind(AlertTriangle, 'warning', 'disputes', 'Dispute'),
  dispute_resolved: kind(CheckCircle2, 'success', 'disputes', 'Dispute resolved'),
  dispute_rejected: kind(XCircle, 'critical', 'disputes', 'Dispute rejected'),
  // Teams
  team_invite: kind(Users, 'accent', 'teams', 'Team invite'),
  team_invite_response: kind(Users, 'success', 'teams', 'Invite reply'),
  team_announcement: kind(Megaphone, 'neutral', 'teams', 'Team'),
  team_member_removed: kind(UserMinus, 'critical', 'teams', 'Removed'),
  team_roster_updated: kind(Users, 'neutral', 'teams', 'Roster'),
  team_captain_changed: kind(Crown, 'neutral', 'teams', 'Captain'),
  // Tournaments
  tournament_announcement: kind(Megaphone, 'neutral', 'tournaments', 'Announcement'),
  tournament_invite: kind(Ticket, 'accent', 'tournaments', 'Invite'),
  ban: kind(ShieldAlert, 'critical', 'tournaments', 'Banned'),
  kick: kind(ShieldAlert, 'warning', 'tournaments', 'Removed'),
  // Staff
  staff_invite: kind(Shield, 'accent', 'staff', 'Staff invite'),
  // System
  general: kind(Bell, 'neutral', 'system', 'Update'),
};

const FALLBACK: NotificationKind = kind(Info, 'neutral', 'system', 'Update');

export function getNotificationKind(type: string | null | undefined): NotificationKind {
  return (type && NOTIFICATION_KINDS[type]) || FALLBACK;
}

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  matches: 'Matches',
  disputes: 'Disputes',
  teams: 'Teams',
  tournaments: 'Tournaments',
  staff: 'Staff',
  system: 'Other',
};

/** Synthetic rows (pending team invites) are not stored server-side and cannot be marked read there. */
export const isSyntheticNotification = (id: string): boolean => String(id).startsWith('invite-');

/**
 * Where a notification should take the user. Captain match rooms first, then
 * the stored link, then type-specific fallbacks.
 */
export async function resolveNotificationDestination(n: Notification): Promise<string | null> {
  const dataLink = typeof n.data?.link === 'string' ? n.data.link : null;
  const direct = (await resolveCaptainMatchNotificationLinkAsync(n)) ?? n.link ?? dataLink ?? null;
  if (direct) return direct;
  if (n.type === 'team_invite') return '/player/teams';
  if (n.type === 'staff_invite') return '/staff/dashboard';
  if (n.type === 'tournament_invite') {
    const invite = getTournamentInviteFromNotification(n);
    if (invite?.data.code) return buildRedeemInvitePath(invite.data.code, invite.data.tournament_id ?? null);
  }
  return null;
}

export interface NotificationDayGroup {
  key: string;
  label: string;
  items: Notification[];
}

export function dayLabel(date: Date, now: Date = new Date()): string {
  const diff = differenceInCalendarDays(now, date);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return format(date, 'EEEE');
  return format(date, date.getFullYear() === now.getFullYear() ? 'MMM d' : 'MMM d, yyyy');
}

/** Groups an already-sorted list by calendar day, keeping order. */
export function groupNotificationsByDay(list: Notification[], now: Date = new Date()): NotificationDayGroup[] {
  return list.reduce<NotificationDayGroup[]>((groups, n) => {
    const d = parseISO(n.created_at);
    const label = isValid(d) ? dayLabel(d, now) : 'Earlier';
    const last = groups[groups.length - 1];
    if (last && last.label === label) return [...groups.slice(0, -1), { ...last, items: [...last.items, n] }];
    return [...groups, { key: `${label}-${groups.length}`, label, items: [n] }];
  }, []);
}
