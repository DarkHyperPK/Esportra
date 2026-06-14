import { describe, expect, it } from 'vitest';
import {
    auditActionLabel,
    formatOrganizationAuditDetails,
    formatTournamentMatchAuditLine,
    resolveOrganizationAuditLogLink,
} from './auditLogFormat';

const ACTION_OPTIONS = [
    { value: 'match.go_live', label: 'Match went live' },
    { value: 'match.score_update', label: 'Score updated' },
];

describe('auditLogFormat', () => {
    it('formats tournament match audit lines with parsed JSON string details', () => {
        const details = JSON.stringify({
            tournament_name: 'Summer Cup',
            match_label: 'Round 1, Match 3',
            matchup: 'Team Alpha vs Team Beta',
            team1_score: 2,
            team2_score: 1,
            actor_role: 'admin',
        });

        expect(
            formatOrganizationAuditDetails({ action: 'match.go_live', details }),
        ).toBe('Summer Cup · Round 1, Match 3 · Team Alpha vs Team Beta · Went live (admin)');

        expect(
            formatOrganizationAuditDetails({ action: 'match.score_update', details }),
        ).toBe('Summer Cup · Round 1, Match 3 · Team Alpha vs Team Beta · Score set to 2–1 (admin)');
    });

    it('resolves organizer bracket links from tournament slug', () => {
        const link = resolveOrganizationAuditLogLink('match.go_live', {
            tournament_slug: 'summer-cup',
            match_id: 'abc-123',
        });

        expect(link).toBe('/organizer/tournament/summer-cup/brackets');
    });

    it('maps action codes to human labels', () => {
        expect(auditActionLabel('MATCH.GO_LIVE', ACTION_OPTIONS)).toBe('Match went live');
    });

    it('includes party code on go-live entries when present', () => {
        const line = formatTournamentMatchAuditLine(
            {
                tournament_name: 'Summer Cup',
                match_label: 'Round 1, Match 3',
                party_code: 'ABCD12',
            },
            'Went live',
        );

        expect(line).toBe('Summer Cup · Round 1, Match 3 · Went live · code ABCD12');
    });
});
