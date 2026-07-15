import { describe, expect, it } from 'vitest';
import { competitorIdsMatch, normalizeCompetitorId } from './competitorId';

describe('competitorId', () => {
    it('strips bracket prefixes and lowercases', () => {
        expect(normalizeCompetitorId('db-ABC-123')).toBe('abc-123');
        expect(normalizeCompetitorId('WB-abc-123')).toBe('abc-123');
    });

    it('matches ids with different prefixes', () => {
        expect(competitorIdsMatch('db-team-1', 'team-1')).toBe(true);
        expect(competitorIdsMatch('team-1', 'team-2')).toBe(false);
    });
});
