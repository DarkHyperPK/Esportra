import { describe, expect, it } from 'vitest';
import {
  getBrScheduleNotificationMeta,
  getMatchScheduleNotificationMeta,
  getMatchWalkoverNotificationMeta,
} from './notificationDisplay';

describe('getMatchScheduleNotificationMeta', () => {
  it('builds dense lines from structured notification data', () => {
    const meta = getMatchScheduleNotificationMeta({
      type: 'match_schedule_changed',
      data: {
        tournament_name: 'Summer Cup',
        stage_name: 'Playoffs',
        match_label: 'Round 2, Match 1',
        matchup: 'Alpha vs Bravo',
        time_label: 'Sat, Jun 14 · 3:00 PM UTC',
        scheduled_time: '2026-06-14T15:00:00.000Z',
      },
    });

    expect(meta).not.toBeNull();
    expect(meta?.detailLines).toEqual([
      'Playoffs',
      'Round 2, Match 1',
      'Alpha vs Bravo',
      'Sun, Jun 14, 3:00 PM UTC',
    ]);
  });

  it('prefers scheduled_time over stale time_label', () => {
    const meta = getMatchScheduleNotificationMeta({
      type: 'match_schedule_changed',
      data: {
        matchup: 'Alpha vs Bravo',
        time_label: 'Sun, Jun 14 · 8:18 PM UTC',
        scheduled_time: '2026-06-14T20:30:00.000Z',
      },
    });

    expect(meta?.timeLabel).toContain('8:30');
    expect(meta?.timeLabel).not.toContain('8:18');
  });

  it('falls back to legacy message lines when data is sparse', () => {
    const meta = getMatchScheduleNotificationMeta({
      type: 'match_schedule_changed',
      message: 'Round 1 — Match 3 is now scheduled for Jun 14, 2026 at 3:00 PM UTC.',
      data: {
        match_number: 3,
        round_index: 0,
      },
    });

    expect(meta?.detailLines).toContain('Round 1 — Match 3 is now scheduled for Jun 14, 2026 at 3:00 PM UTC.');
  });

  it('returns null for non-schedule notifications', () => {
    expect(getMatchScheduleNotificationMeta({ type: 'team_invite' })).toBeNull();
  });
});

describe('getMatchWalkoverNotificationMeta', () => {
  it('builds organizer no-show lines from structured data', () => {
    const meta = getMatchWalkoverNotificationMeta({
      type: 'match_walkover',
      data: {
        tournament_name: 'Summer Cup',
        stage_name: 'Playoffs',
        match_label: 'Round 2, Match 1',
        matchup: 'Alpha vs Bravo',
        audience: 'organizer',
        reason: 'neither_checked_in',
      },
    });

    expect(meta).not.toBeNull();
    expect(meta?.actionLabel).toBe('Open bracket');
    expect(meta?.detailLines).toEqual([
      'Playoffs',
      'Round 2, Match 1',
      'Alpha vs Bravo',
      'Neither team checked in before the window closed.',
      'Review or reset the forfeited match from the bracket.',
    ]);
  });

  it('returns null for captain walkover notifications', () => {
    expect(
      getMatchWalkoverNotificationMeta({
        type: 'match_walkover',
        data: { audience: 'captain', reason: 'walkover' },
      }),
    ).toBeNull();
  });
});

describe('getBrScheduleNotificationMeta', () => {
  it('builds dense BR game schedule lines', () => {
    const meta = getBrScheduleNotificationMeta({
      type: 'br_game_schedule_changed',
      data: {
        tournament_name: 'BR Open',
        stage_name: 'Finals',
        group_label: 'Group A',
        wave_number: 2,
        game_number: 3,
        lobby_code: 'ABC123',
        scheduled_at: '2026-06-14T15:00:00.000Z',
      },
    });

    expect(meta?.detailLines).toEqual([
      'BR Open',
      'Finals · Group A · Matchday 2',
      'Game 3',
      expect.stringContaining('Jun'),
      'Lobby code: ABC123',
    ]);
    expect(meta?.actionLabel).toBe('Open BR game room');
  });
});
