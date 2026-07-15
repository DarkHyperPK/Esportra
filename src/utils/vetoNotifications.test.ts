import { describe, expect, it } from 'vitest';
import { extractCaptainUserIds, isValidNotificationUserId } from './vetoNotifications';

describe('vetoNotifications', () => {
    it('validates GUID user ids', () => {
        expect(isValidNotificationUserId('825129c1-709c-4146-bc72-61ffb160a574')).toBe(true);
        expect(isValidNotificationUserId(undefined)).toBe(false);
        expect(isValidNotificationUserId('not-a-guid')).toBe(false);
    });

    it('extracts and dedupes captain user ids from member rows', () => {
        const ids = extractCaptainUserIds([
            { user_id: '825129c1-709c-4146-bc72-61ffb160a574' },
            { userId: '2f158e56-cca7-4a6a-bdaf-6eff41ea4874' },
            { user_id: '825129c1-709c-4146-bc72-61ffb160a574' },
            { captain_id: 'ignored-field' },
        ]);

        expect(ids).toEqual([
            '825129c1-709c-4146-bc72-61ffb160a574',
            '2f158e56-cca7-4a6a-bdaf-6eff41ea4874',
        ]);
    });

    it('returns empty array for invalid or empty input', () => {
        expect(extractCaptainUserIds(null)).toEqual([]);
        expect(extractCaptainUserIds([{ captain_id: '825129c1-709c-4146-bc72-61ffb160a574' }])).toEqual([]);
    });
});
