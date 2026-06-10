import { describe, expect, it } from 'vitest';
import {
  buildCaptainMatchRoomLink,
  resolveCaptainMatchNotificationLink,
} from './notificationLinks';

describe('notificationLinks', () => {
  describe('buildCaptainMatchRoomLink', () => {
    it('prefers explicit tournament slug', () => {
      expect(
        buildCaptainMatchRoomLink('summer-cup', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'match-1'),
      ).toBe('/tournaments/summer-cup/captain-match/match-1');
    });

    it('uses non-uuid tournament id as slug fallback', () => {
      expect(buildCaptainMatchRoomLink(null, 'summer-cup', 'match-1')).toBe(
        '/tournaments/summer-cup/captain-match/match-1',
      );
    });

    it('falls back to tournaments list when slug cannot be resolved', () => {
      expect(
        buildCaptainMatchRoomLink(
          null,
          'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          'match-1',
        ),
      ).toBe('/tournaments');
    });
  });

  describe('resolveCaptainMatchNotificationLink', () => {
    it('builds captain match room link from notification data', () => {
      expect(
        resolveCaptainMatchNotificationLink({
          type: 'match_ready',
          link: '/tournaments/captain',
          data: { match_id: 'abc-123', tournament_slug: 'summer-cup' },
        }),
      ).toBe('/tournaments/summer-cup/captain-match/abc-123');
    });

    it('keeps valid captain match links', () => {
      expect(
        resolveCaptainMatchNotificationLink({
          type: 'match_ready',
          link: '/tournaments/summer-cup/captain-match/abc-123',
          data: { match_id: 'abc-123' },
        }),
      ).toBe('/tournaments/summer-cup/captain-match/abc-123');
    });

    it('returns null for legacy links that need async slug resolution', () => {
      expect(
        resolveCaptainMatchNotificationLink({
          type: 'match_ready',
          link: '/tournaments/captain',
          data: { match_id: 'abc-123' },
        }),
      ).toBeNull();
    });
  });
});
