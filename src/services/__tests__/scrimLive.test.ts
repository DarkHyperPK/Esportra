import { describe, expect, it } from 'vitest';
import { SESSION_POLL_MS, TEAM_SESSIONS_POLL_MS, sessionPollInterval, shouldRefreshScrims, teamSessionsPollInterval } from '../scrimLive';

describe('shouldRefreshScrims', () => {
  it('refreshes for every scrim notification the backend sends', () => {
    const backendTypes = [
      'scrim_offer_received', 'scrim_offer_accepted', 'scrim_offer_declined', 'scrim_offer_withdrawn',
      'scrim_result_submitted', 'scrim_result_confirmed', 'scrim_dispute_raised', 'scrim_dispute_resolved',
      'scrim_checkin_updated', 'scrim_checkin_window_open', 'scrim_session_started', 'scrim_lobby_updated',
      'scrim_veto_ready', 'scrim_timeout_cancelled', 'scrim_session_cancelled', 'scrim_reminder_30min',
    ];
    for (const type of backendTypes) expect(shouldRefreshScrims(type), type).toBe(true);
  });

  it('also covers scrim types added later', () => {
    expect(shouldRefreshScrims('scrim_something_new')).toBe(true);
  });

  it('ignores everything else', () => {
    expect(shouldRefreshScrims('match_ready')).toBe(false);
    expect(shouldRefreshScrims('lfg_interest_received')).toBe(false);
    expect(shouldRefreshScrims('')).toBe(false);
    expect(shouldRefreshScrims(null)).toBe(false);
    expect(shouldRefreshScrims(undefined)).toBe(false);
  });
});

describe('sessionPollInterval', () => {
  it('polls while a scrim can still change, as a safety net for a missed push', () => {
    for (const status of ['scheduled', 'in_progress', 'disputed'] as const) {
      expect(sessionPollInterval(status)).toBe(SESSION_POLL_MS);
    }
  });
  it('stops once a scrim is over, or before it has loaded', () => {
    expect(sessionPollInterval('completed')).toBe(false);
    expect(sessionPollInterval('cancelled')).toBe(false);
    expect(sessionPollInterval(undefined)).toBe(false);
  });
});

describe('teamSessionsPollInterval', () => {
  it('polls only when something is active', () => {
    expect(teamSessionsPollInterval([{ status: 'completed' }, { status: 'scheduled' }])).toBe(TEAM_SESSIONS_POLL_MS);
    expect(teamSessionsPollInterval([{ status: 'completed' }, { status: 'cancelled' }])).toBe(false);
    expect(teamSessionsPollInterval([])).toBe(false);
    expect(teamSessionsPollInterval(undefined)).toBe(false);
  });
});
