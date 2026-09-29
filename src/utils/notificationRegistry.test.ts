import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({ apiClient: { get: vi.fn().mockRejectedValue(new Error('offline')) } }));

import type { Notification } from '@/contexts/notification-context';
import {
  NOTIFICATION_KINDS,
  dayLabel,
  getNotificationKind,
  groupNotificationsByDay,
  isSyntheticNotification,
  resolveNotificationDestination,
} from './notificationRegistry';

const n = (over: Partial<Notification>): Notification => ({
  id: 'n1',
  user_id: 'u1',
  type: 'general',
  title: 'T',
  message: 'M',
  is_read: false,
  created_at: '2026-10-04T12:00:00Z',
  ...over,
});

/** Every type the app emits or handles today (sidebar, page, provider, link and display utils). */
const KNOWN_TYPES = [
  'team_invite', 'team_invite_response', 'team_announcement', 'team_member_removed', 'team_roster_updated',
  'team_captain_changed', 'staff_invite', 'result_reported', 'result_accepted', 'result_disputed',
  'dispute_filed', 'dispute_resolved', 'dispute_rejected', 'tournament_announcement', 'tournament_invite',
  'ban', 'kick', 'match_ready', 'veto_your_turn', 'veto_completed', 'match_schedule_changed',
  'br_game_schedule_changed', 'br_lobby_schedule_changed', 'match_walkover', 'match_completed', 'general',
];

describe('notificationRegistry', () => {
  it('has an explicit entry for every known type', () => {
    const missing = KNOWN_TYPES.filter((t) => !NOTIFICATION_KINDS[t]);
    expect(missing).toEqual([]);
  });

  it('falls back to a neutral system kind for unknown types', () => {
    const k = getNotificationKind('something_new');
    expect(k.tone).toBe('neutral');
    expect(k.category).toBe('system');
  });

  it('keeps accent for act-now types only', () => {
    const accent = Object.entries(NOTIFICATION_KINDS).filter(([, k]) => k.tone === 'accent').map(([t]) => t).sort();
    expect(accent).toEqual(['match_ready', 'staff_invite', 'team_invite', 'tournament_invite', 'veto_your_turn']);
  });

  it('detects synthetic invite rows', () => {
    expect(isSyntheticNotification('invite-123')).toBe(true);
    expect(isSyntheticNotification('abc')).toBe(false);
  });
});

describe('dayLabel / groupNotificationsByDay', () => {
  const now = new Date('2026-10-08T15:00:00');

  it('labels today, yesterday, weekday and older dates', () => {
    expect(dayLabel(new Date('2026-10-08T01:00:00'), now)).toBe('Today');
    expect(dayLabel(new Date('2026-10-07T23:00:00'), now)).toBe('Yesterday');
    expect(dayLabel(new Date('2026-10-05T10:00:00'), now)).toBe('Monday');
    expect(dayLabel(new Date('2026-09-20T10:00:00'), now)).toBe('Sep 20');
    expect(dayLabel(new Date('2025-09-20T10:00:00'), now)).toBe('Sep 20, 2025');
  });

  it('groups consecutive items by day in order', () => {
    const groups = groupNotificationsByDay([
      n({ id: 'a', created_at: '2026-10-08T10:00:00' }),
      n({ id: 'b', created_at: '2026-10-08T09:00:00' }),
      n({ id: 'c', created_at: '2026-10-07T09:00:00' }),
    ], now);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ['Today', ['a', 'b']],
      ['Yesterday', ['c']],
    ]);
  });
});

describe('resolveNotificationDestination', () => {
  it('uses the stored link when there is no match room', async () => {
    expect(await resolveNotificationDestination(n({ type: 'team_announcement', link: '/player/teams/7' }))).toBe('/player/teams/7');
  });

  it('builds the captain match room from data', async () => {
    const dest = await resolveNotificationDestination(n({ type: 'match_ready', data: { match_id: 'm1', tournament_slug: 'kvo' } }));
    expect(dest).toBe('/tournaments/kvo/captain-match/m1');
  });

  it('sends pending team invites to teams', async () => {
    expect(await resolveNotificationDestination(n({ type: 'team_invite' }))).toBe('/player/teams');
  });

  it('falls back to the redeem page for tournament invites', async () => {
    const dest = await resolveNotificationDestination(n({ type: 'tournament_invite', data: { code: 'KVO-7F2A', tournament_id: 'kvo' } }));
    expect(dest).toBe('/invitations/redeem?code=KVO-7F2A&tournament=kvo');
  });

  it('returns null when nothing applies', async () => {
    expect(await resolveNotificationDestination(n({ type: 'general' }))).toBeNull();
  });
});
