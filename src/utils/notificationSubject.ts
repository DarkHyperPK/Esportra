import { isValid, parseISO } from 'date-fns';
import type { Notification } from '@/contexts/notification-context';
import { getNotificationKind } from '@/utils/notificationRegistry';

/** What a notification is about, so the UI can show it instead of a generic icon. */
export type NotificationSubject =
  | { kind: 'versus'; a: string; b: string }
  | { kind: 'game'; game: string }
  | { kind: 'entity'; name: string }
  | { kind: 'glyph' };

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

const VS_RE = /([^\n·|—:]+?)\s+vs\.?\s+([^\n·|—,.]+)/i;

export function parseVersus(text: string | null | undefined): { a: string; b: string } | null {
  if (!text) return null;
  const m = text.match(VS_RE);
  if (!m) return null;
  const a = m[1].replace(/^.*\b(?:between|for|:)\s+/i, '').trim();
  const b = m[2].trim();
  return a && b ? { a, b } : null;
}

export function getNotificationSubject(n: Notification): NotificationSubject {
  const d = n.data ?? {};
  const team1 = str(d.team1_name);
  const team2 = str(d.team2_name);
  if (team1 && team2) return { kind: 'versus', a: team1, b: team2 };

  const category = getNotificationKind(n.type).category;
  if (category === 'matches' || category === 'disputes') {
    const vs = parseVersus(str(d.matchup)) ?? parseVersus(n.message) ?? parseVersus(n.title);
    if (vs) return { kind: 'versus', ...vs };
  }

  const game = str(d.game);
  if (game) return { kind: 'game', game };

  const org = str(d.org_name);
  if (n.type === 'staff_invite' && org) return { kind: 'entity', name: org };

  const team = str(d.team_name) ?? team1 ?? team2;
  if (team) return { kind: 'entity', name: team };

  const tournament = str(d.tournament_name);
  if (tournament && category === 'tournaments') return { kind: 'entity', name: tournament };

  return { kind: 'glyph' };
}

/** Two-letter monogram: first letters of the first two words, or the first two letters. */
export function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Unread items that need the user to do something now. */
export function isPriorityNotification(n: Notification): boolean {
  return !n.is_read && getNotificationKind(n.type).tone === 'accent';
}

const ACTION_LABELS: Record<string, string> = {
  veto_your_turn: 'Open match room',
  match_ready: 'Open match room',
  team_invite: 'Review invite',
  tournament_invite: 'Redeem invite',
};

export function priorityActionLabel(type: string): string {
  return ACTION_LABELS[type] ?? 'Open';
}

/** The moment this notification is counting down to, if the data carries one in the future. */
export function notificationDeadline(n: Notification, now: Date = new Date()): { at: Date; label: 'Expires' | 'Starts' } | null {
  const d = n.data ?? {};
  const pick = (key: string, label: 'Expires' | 'Starts') => {
    const raw = str(d[key]);
    if (!raw) return null;
    const at = parseISO(raw);
    return isValid(at) && at > now ? { at, label } : null;
  };
  return pick('expires_at', 'Expires') ?? pick('deadline', 'Expires') ?? pick('scheduled_time', 'Starts') ?? pick('scheduled_at', 'Starts');
}
