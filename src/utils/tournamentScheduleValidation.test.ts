import { describe, expect, it } from 'vitest';
import {
  formatTournamentWindow,
  getTournamentDatetimeLocalBounds,
  maxDatetimeLocal,
  validateLiveActionInTournamentWindow,
  validateLocalDatetimeInTournamentWindow,
  validateTimestampInTournamentWindow,
} from './tournamentScheduleValidation';

describe('tournamentScheduleValidation', () => {
  const start = '2026-06-13T10:00:00.000Z';
  const end = '2026-06-20T10:00:00.000Z';

  it('formats tournament window', () => {
    expect(formatTournamentWindow(start, end)).toMatch(/Jun 13, 2026/);
    expect(formatTournamentWindow(start, end)).toMatch(/Jun 20, 2026/);
  });

  it('rejects timestamps before start', () => {
    const err = validateTimestampInTournamentWindow(
      '2026-06-12T12:00:00.000Z',
      start,
      end,
      'Round schedule',
    );
    expect(err).toContain('Round schedule');
    expect(err).toContain('tournament window');
  });

  it('rejects timestamps after end', () => {
    const err = validateTimestampInTournamentWindow(
      '2026-06-21T12:00:00.000Z',
      start,
      end,
      'Game schedule',
    );
    expect(err).toContain('Game schedule');
  });

  it('accepts timestamps inside window', () => {
    expect(
      validateTimestampInTournamentWindow('2026-06-15T12:00:00.000Z', start, end, 'Schedule'),
    ).toBeNull();
  });

  it('validates local datetime strings', () => {
    const bounds = getTournamentDatetimeLocalBounds(start, end);
    expect(bounds.min).toBeTruthy();
    expect(bounds.max).toBeTruthy();
    expect(
      validateLocalDatetimeInTournamentWindow(bounds.min, start, end, 'Lobby schedule'),
    ).toBeNull();
  });

  it('blocks live actions outside window', () => {
    const beforeStart = new Date('2026-06-12T12:00:00.000Z').getTime();
    expect(
      validateLiveActionInTournamentWindow(start, end, 'Starting a round', beforeStart),
    ).toContain('Starting a round');
  });

  it('maxDatetimeLocal picks later value', () => {
    expect(maxDatetimeLocal('2026-06-13T14:00', '2026-06-13T16:00')).toBe('2026-06-13T16:00');
    expect(maxDatetimeLocal('', '2026-06-13T16:00')).toBe('2026-06-13T16:00');
  });
});
