import { describe, expect, it } from 'vitest';
import {
  CHECKIN_OPENS_BEFORE_MIN,
  CHECKIN_CLOSES_AFTER_MIN,
  deriveScrimNextAction,
  type NextActionSession,
} from '../scrimNextAction';

const T = Date.parse('2026-11-02T20:00:00Z');
const at = (offsetMin: number) => new Date(T + offsetMin * 60_000).toISOString();

function session(over: Partial<NextActionSession> = {}): NextActionSession {
  return {
    team1Id: 'a',
    team2Id: 'b',
    status: 'scheduled',
    scheduledAt: at(0),
    resultReportedByTeam1: false,
    resultReportedByTeam2: false,
    team1CheckedInAt: null,
    team2CheckedInAt: null,
    dispute: null,
    ...over,
  };
}

describe('deriveScrimNextAction', () => {
  it('matches the backend check-in window (T-15 to T+15)', () => {
    expect(CHECKIN_OPENS_BEFORE_MIN).toBe(15);
    expect(CHECKIN_CLOSES_AFTER_MIN).toBe(15);
  });

  it('waits before the window opens', () => {
    const r = deriveScrimNextAction(session(), 'a', T - 60 * 60_000);
    expect(r.stage).toBe('scheduled');
    expect(r.action).toBe('wait');
    expect(r.deadline).toBe(at(-CHECKIN_OPENS_BEFORE_MIN));
  });

  it('asks me to check in inside the window', () => {
    const r = deriveScrimNextAction(session(), 'a', T - 5 * 60_000);
    expect(r.stage).toBe('checkin');
    expect(r.action).toBe('check_in');
    expect(r.deadline).toBe(at(CHECKIN_CLOSES_AFTER_MIN));
  });

  it('follows the server flag, not just the clock, once the payload carries it', () => {
    const inWindow = T - 5 * 60_000;
    expect(deriveScrimNextAction(session({ checkinWindowOpenedAt: null }), 'a', inWindow))
      .toMatchObject({ stage: 'checkin', action: 'wait', deadline: null });
    expect(deriveScrimNextAction(session({ checkinWindowOpenedAt: at(-15) }), 'a', inWindow).action).toBe('check_in');
    // Older payloads without the field keep the clock-based behaviour.
    expect(deriveScrimNextAction(session(), 'a', inWindow).action).toBe('check_in');
  });

  it('opens exactly at T-15 and closes after T+15', () => {
    expect(deriveScrimNextAction(session(), 'a', T - 15 * 60_000).action).toBe('check_in');
    expect(deriveScrimNextAction(session(), 'a', T - 15 * 60_000 - 1).action).toBe('wait');
    expect(deriveScrimNextAction(session(), 'a', T + 15 * 60_000).action).toBe('check_in');
    expect(deriveScrimNextAction(session(), 'a', T + 15 * 60_000 + 1).action).toBe('wait_opponent');
  });

  it('waits for the opponent once I have checked in', () => {
    const r = deriveScrimNextAction(session({ team1CheckedInAt: at(-3) }), 'a', T - 2 * 60_000);
    expect(r.action).toBe('wait_opponent');
  });

  it('uses team2 flags when I am team2', () => {
    const s = session({ team2CheckedInAt: at(-3) });
    expect(deriveScrimNextAction(s, 'b', T - 2 * 60_000).action).toBe('wait_opponent');
    expect(deriveScrimNextAction(s, 'a', T - 2 * 60_000).action).toBe('check_in');
  });

  it('asks me to report when live and nobody reported', () => {
    const r = deriveScrimNextAction(session({ status: 'in_progress' }), 'a', T + 30 * 60_000);
    expect(r.stage).toBe('live');
    expect(r.action).toBe('report_result');
  });

  it('asks me to confirm when the opponent reported first', () => {
    const r = deriveScrimNextAction(
      session({ status: 'in_progress', resultReportedByTeam2: true }),
      'a',
      T + 30 * 60_000,
    );
    expect(r.stage).toBe('result');
    expect(r.action).toBe('confirm_result');
  });

  it('waits for the opponent after I reported', () => {
    const r = deriveScrimNextAction(
      session({ status: 'in_progress', resultReportedByTeam1: true }),
      'a',
      T + 30 * 60_000,
    );
    expect(r.action).toBe('wait_opponent');
  });

  it('flags evidence for an open dispute and a wait otherwise', () => {
    const base = { status: 'disputed' as const };
    expect(
      deriveScrimNextAction(session({ ...base, dispute: { status: 'open', raisedByTeamId: 'b', responderEvidenceUrls: null } }), 'a', T).action,
    ).toBe('submit_evidence');
    expect(
      deriveScrimNextAction(session({ ...base, dispute: { status: 'open', raisedByTeamId: 'a', responderEvidenceUrls: null } }), 'a', T).action,
    ).toBe('wait_staff');
  });

  it('does not ask for evidence once the responder has submitted it', () => {
    const s = session({
      status: 'disputed',
      dispute: { status: 'open', raisedByTeamId: 'b', responderEvidenceUrls: ['https://x/y.png'] },
    });
    expect(deriveScrimNextAction(s, 'a', T).action).toBe('wait_staff');
  });

  it('is terminal for completed and cancelled', () => {
    expect(deriveScrimNextAction(session({ status: 'completed' }), 'a', T).stage).toBe('confirmed');
    expect(deriveScrimNextAction(session({ status: 'cancelled' }), 'a', T).action).toBe('none');
  });

  it('treats a session with no time as waiting', () => {
    expect(deriveScrimNextAction(session({ scheduledAt: null }), 'a', T).action).toBe('wait');
  });
});
