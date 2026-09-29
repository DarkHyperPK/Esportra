import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({ apiClient: { get: vi.fn() } }));

import type { Notification } from '@/contexts/notification-context';
import {
  getNotificationSubject, initials, isPriorityNotification, notificationDeadline, parseVersus, priorityActionLabel,
} from './notificationSubject';

const n = (over: Partial<Notification>): Notification => ({
  id: 'n', user_id: 'u', type: 'general', title: 'T', message: '', is_read: false, created_at: '2026-10-04T12:00:00Z', ...over,
});

describe('parseVersus', () => {
  it('reads "A vs B" out of free text', () => {
    expect(parseVersus('Night Owls vs Crimson Five · Quarter-final')).toEqual({ a: 'Night Owls', b: 'Crimson Five' });
    expect(parseVersus('Match between Zero Ping vs. Byte Force')).toEqual({ a: 'Zero Ping', b: 'Byte Force' });
  });
  it('returns null without a matchup', () => {
    expect(parseVersus('Check-in opens at 7:30 PM')).toBeNull();
  });
});

describe('getNotificationSubject', () => {
  it('prefers explicit team names', () => {
    expect(getNotificationSubject(n({ type: 'match_schedule_changed', data: { team1_name: 'A1', team2_name: 'B2' } })))
      .toEqual({ kind: 'versus', a: 'A1', b: 'B2' });
  });
  it('parses the matchup from the message for match types', () => {
    expect(getNotificationSubject(n({ type: 'veto_your_turn', message: 'Night Owls vs Crimson Five · QF' })))
      .toEqual({ kind: 'versus', a: 'Night Owls', b: 'Crimson Five' });
  });
  it('does not parse matchups for non-match types', () => {
    expect(getNotificationSubject(n({ type: 'tournament_announcement', message: 'A vs B tonight' })).kind).toBe('glyph');
  });
  it('uses the game, then the org, then falls back to a glyph', () => {
    expect(getNotificationSubject(n({ type: 'tournament_invite', data: { game: 'Valorant' } }))).toEqual({ kind: 'game', game: 'Valorant' });
    expect(getNotificationSubject(n({ type: 'staff_invite', data: { org_name: 'Arena One' } }))).toEqual({ kind: 'entity', name: 'Arena One' });
    expect(getNotificationSubject(n({ type: 'general' }))).toEqual({ kind: 'glyph' });
  });
});

describe('helpers', () => {
  it('builds monograms', () => {
    expect(initials('Night Owls')).toBe('NO');
    expect(initials('crimson')).toBe('CR');
    expect(initials('Team #5 Esports')).toBe('T5');
    expect(initials('  ')).toBe('?');
  });
  it('flags unread act-now items as priority', () => {
    expect(isPriorityNotification(n({ type: 'veto_your_turn' }))).toBe(true);
    expect(isPriorityNotification(n({ type: 'veto_your_turn', is_read: true }))).toBe(false);
    expect(isPriorityNotification(n({ type: 'result_accepted' }))).toBe(false);
  });
  it('labels the main action', () => {
    expect(priorityActionLabel('match_ready')).toBe('Open match room');
    expect(priorityActionLabel('something')).toBe('Open');
  });
  it('finds a future deadline only', () => {
    const now = new Date('2026-10-04T12:00:00Z');
    expect(notificationDeadline(n({ data: { expires_at: '2026-10-05T12:00:00Z' } }), now)?.label).toBe('Expires');
    expect(notificationDeadline(n({ data: { scheduled_time: '2026-10-04T15:00:00Z' } }), now)?.label).toBe('Starts');
    expect(notificationDeadline(n({ data: { scheduled_time: '2026-10-03T15:00:00Z' } }), now)).toBeNull();
  });
});
