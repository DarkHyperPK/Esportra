import { describe, expect, it } from 'vitest';
import { getSelfPlayMatchPhase, isSelfPlayMatchLive } from './selfPlayMatchFlow';

describe('selfPlayMatchFlow', () => {
    it('walks through the self-play sequence in order', () => {
        const scheduled = '2026-06-13T20:00:00.000Z';

        expect(getSelfPlayMatchPhase({
            status: 'pending',
            effectiveScheduledTime: null,
            bothCheckedIn: false,
            isVetoEnabled: true,
            isVetoCompleted: false,
        })).toBe('needs_schedule');

        expect(getSelfPlayMatchPhase({
            status: 'pending',
            effectiveScheduledTime: scheduled,
            bothCheckedIn: false,
            isVetoEnabled: true,
            isVetoCompleted: false,
        })).toBe('awaiting_checkin');

        expect(getSelfPlayMatchPhase({
            status: 'pending',
            effectiveScheduledTime: scheduled,
            bothCheckedIn: true,
            isVetoEnabled: true,
            isVetoCompleted: false,
        })).toBe('awaiting_party_code');

        expect(getSelfPlayMatchPhase({
            status: 'in_progress',
            effectiveScheduledTime: scheduled,
            bothCheckedIn: true,
            partyCode: 'ABC123',
            isVetoEnabled: true,
            isVetoCompleted: false,
        })).toBe('awaiting_veto');

        expect(getSelfPlayMatchPhase({
            status: 'in_progress',
            effectiveScheduledTime: scheduled,
            bothCheckedIn: true,
            partyCode: 'ABC123',
            isVetoEnabled: true,
            isVetoCompleted: true,
        })).toBe('ready_for_match');
    });

    it('treats only in_progress as live', () => {
        expect(isSelfPlayMatchLive('pending')).toBe(false);
        expect(isSelfPlayMatchLive('in_progress')).toBe(true);
    });
});
