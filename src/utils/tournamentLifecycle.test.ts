import { describe, expect, it } from 'vitest';
import {
  deriveTournamentPhase,
  evaluateRegistrationEligibility,
  getRegistrationDeadlineEnd,
  isRegistrationDeadlineOpen,
  isRegistrationOpensReached,
  toLocalDateTimeInputValue,
} from './tournamentLifecycle';

describe('tournamentLifecycle', () => {
  it('treats UTC-midnight deadline as inclusive through end of that UTC day', () => {
    const deadline = new Date('2026-06-14T00:00:00.000Z');
    const end = getRegistrationDeadlineEnd(deadline);
    expect(end?.toISOString()).toBe('2026-06-14T23:59:59.999Z');

    const afternoon = new Date('2026-06-14T15:00:00.000Z');
    expect(isRegistrationDeadlineOpen(deadline, afternoon)).toBe(true);

    const dayBefore = new Date('2026-06-13T23:00:00.000Z');
    expect(isRegistrationDeadlineOpen(deadline, dayBefore)).toBe(true);

    const afterEnd = new Date('2026-06-15T00:00:01.000Z');
    expect(isRegistrationDeadlineOpen(deadline, afterEnd)).toBe(false);
  });

  it('uses exact instant when deadline has a specific time', () => {
    const deadline = new Date('2026-06-14T18:00:00.000Z');
    expect(isRegistrationDeadlineOpen(deadline, new Date('2026-06-14T17:59:00.000Z'))).toBe(true);
    expect(isRegistrationDeadlineOpen(deadline, new Date('2026-06-14T18:01:00.000Z'))).toBe(false);
  });

  it('evaluates status + opens + deadline + start together', () => {
    const now = new Date('2026-06-13T12:00:00.000Z');
    const result = evaluateRegistrationEligibility({
      status: 'published',
      registrationOpens: new Date('2026-06-10T00:00:00.000Z'),
      registrationDeadline: new Date('2026-06-14T00:00:00.000Z'),
      startDate: new Date('2026-06-15T18:00:00.000Z'),
      now,
    });
    expect(result.allowed).toBe(true);
  });

  it('rejects registration before opens', () => {
    const now = new Date('2026-06-09T12:00:00.000Z');
    const result = evaluateRegistrationEligibility({
      status: 'open',
      registrationOpens: new Date('2026-06-10T12:00:00.000Z'),
      registrationDeadline: new Date('2026-06-14T00:00:00.000Z'),
      startDate: new Date('2026-06-15T18:00:00.000Z'),
      now,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Registration has not opened yet.');
  });

  it('derives registration_closed when deadline passed but tournament not started', () => {
    const now = new Date('2026-06-15T00:00:00.000Z');
    expect(
      deriveTournamentPhase({
        status: 'published',
        registrationDeadline: new Date('2026-06-14T00:00:00.000Z'),
        startDate: new Date('2026-06-16T18:00:00.000Z'),
        now,
      }),
    ).toBe('registration_closed');
  });

  it('formats datetime-local values in local time', () => {
    const d = new Date(2026, 5, 14, 9, 30, 0, 0);
    expect(toLocalDateTimeInputValue(d)).toBe('2026-06-14T09:30');
  });

  it('isRegistrationOpensReached defaults to true when unset', () => {
    expect(isRegistrationOpensReached(null)).toBe(true);
  });
});
