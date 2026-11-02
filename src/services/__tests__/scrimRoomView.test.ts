import { describe, expect, it } from 'vitest';
import { ROOM_STEPS, actionLabel, describeNextStep, formatRoomTime, railState } from '../scrimRoomView';
import type { ScrimNextAction } from '../scrimNextAction';

const NOW = Date.parse('2026-11-02T20:00:00Z');
const at = (min: number) => new Date(NOW + min * 60_000).toISOString();
const next = (over: Partial<ScrimNextAction>): ScrimNextAction => ({ stage: 'scheduled', action: 'wait', deadline: null, ...over });

describe('railState', () => {
  it('maps each stage to its position', () => {
    expect(railState('scheduled')).toMatchObject({ current: 0, variant: 'normal' });
    expect(railState('checkin').current).toBe(1);
    expect(railState('live').current).toBe(2);
    expect(railState('result').current).toBe(3);
  });
  it('marks a finished scrim as fully complete', () => {
    expect(railState('confirmed')).toMatchObject({ current: ROOM_STEPS.length, variant: 'normal' });
  });
  it('flags a dispute at the result step', () => {
    expect(railState('disputed')).toMatchObject({ current: 3, variant: 'disputed' });
  });
  it('shows a cancelled scrim as stopped, with nothing complete', () => {
    expect(railState('cancelled')).toMatchObject({ current: -1, variant: 'cancelled' });
  });
});

describe('describeNextStep', () => {
  it('tells me to check in, urgently, and points at the check-in panel', () => {
    const v = describeNextStep(next({ stage: 'checkin', action: 'check_in', deadline: at(12) }), { opponent: 'Nova' }, NOW);
    expect(v.headline).toBe('Check in now');
    expect(v.body).toContain('12 min');
    expect(v.target).toBe('room-checkin');
    expect(v.urgent).toBe(true);
  });

  it('says when check-in opens while it is still early', () => {
    const v = describeNextStep(next({ action: 'wait', deadline: at(45) }), { opponent: 'Nova' }, NOW);
    expect(v.headline).toMatch(/opens in 45 min/);
    expect(v.target).toBeNull();
  });

  it('says check-in is opening, not "check in now", when the server has not opened it yet', () => {
    const v = describeNextStep(next({ stage: 'checkin', action: 'wait' }), { opponent: 'Nova' }, NOW);
    expect(v.headline).toBe('Check-in is opening');
    expect(v.target).toBeNull();
    expect(v.urgent).toBe(false);
  });

  it('words waiting differently per stage', () => {
    expect(describeNextStep(next({ stage: 'checkin', action: 'wait_opponent' }), { opponent: 'Nova' }, NOW).headline)
      .toBe("You're checked in");
    expect(describeNextStep(next({ stage: 'result', action: 'wait_opponent' }), { opponent: 'Nova' }, NOW).headline)
      .toBe('Waiting for Nova to confirm');
  });

  it('routes result and dispute actions to their panels', () => {
    expect(describeNextStep(next({ stage: 'live', action: 'report_result' }), { opponent: 'Nova' }, NOW).target).toBe('room-result');
    expect(describeNextStep(next({ stage: 'result', action: 'confirm_result' }), { opponent: 'Nova' }, NOW).headline).toContain('Nova');
    expect(describeNextStep(next({ stage: 'disputed', action: 'submit_evidence' }), { opponent: 'Nova' }, NOW).target).toBe('room-dispute');
  });

  it('explains a cancelled scrim using the recorded reason', () => {
    const base = { stage: 'cancelled', action: 'none' } as const;
    expect(describeNextStep(next(base), { opponent: 'Nova', cancelledReason: 'checkin_timeout' }, NOW).body)
      .toContain('checked in on time');
    expect(describeNextStep(next(base), { opponent: 'Nova', cancelledReason: 'cancelled_by_team', cancelledByName: 'Nova' }, NOW).body)
      .toContain('Nova cancelled');
    expect(describeNextStep(next(base), { opponent: 'Nova', cancelledReason: null }, NOW).body)
      .toBe('This scrim was cancelled.');
  });

  it('closes out a confirmed scrim with no action', () => {
    const v = describeNextStep(next({ stage: 'confirmed', action: 'none' }), { opponent: 'Nova' }, NOW);
    expect(v.headline).toBe('Scrim complete');
    expect(v.target).toBeNull();
    expect(v.urgent).toBe(false);
  });

  it('falls back to a neutral opponent name', () => {
    expect(describeNextStep(next({ stage: 'result', action: 'confirm_result' }), { opponent: null }, NOW).headline)
      .toContain('your opponent');
  });
});

describe('formatRoomTime', () => {
  it('formats a date and time, and tolerates missing or invalid input', () => {
    expect(formatRoomTime(new Date(2026, 10, 2, 20, 0).toISOString())).toMatch(/·/);
    expect(formatRoomTime(null)).toBe('');
    expect(formatRoomTime('nope')).toBe('');
  });
});

describe('actionLabel', () => {
  it('names the action, and falls back to opening the room', () => {
    expect(actionLabel('check_in')).toBe('Check in');
    expect(actionLabel('report_result')).toBe('Report result');
    expect(actionLabel('confirm_result')).toBe('Review result');
    expect(actionLabel('submit_evidence')).toBe('Add evidence');
    expect(actionLabel('wait')).toBe('Open room');
    expect(actionLabel('none')).toBe('Open room');
  });
});

describe('agreeing a time', () => {
  const ctx = { opponent: 'Nova', proposedAt: new Date(2026, 10, 3, 20, 0).toISOString() };
  const n = (action: ScrimNextAction['action']): ScrimNextAction => ({ stage: 'scheduled', action, deadline: null });

  it('tells the captain to agree a time, and points at the scheduling panel', () => {
    const v = describeNextStep(n('propose_time'), ctx, NOW);
    expect(v.headline).toBe('Agree a time');
    expect(v.target).toBe('room-schedule');
    expect(v.urgent).toBe(false);
  });

  it('names who proposed and what they proposed', () => {
    const v = describeNextStep(n('respond_time'), ctx, NOW);
    expect(v.headline).toBe('Nova proposed a time');
    expect(v.body).toMatch(/·/);
    expect(v.body).toContain('Accept it, or suggest another');
    expect(v.target).toBe('room-schedule');
  });

  it('says who we are waiting for', () => {
    expect(describeNextStep(n('wait_time'), ctx, NOW).headline).toBe('Waiting for Nova to answer');
    expect(describeNextStep(n('wait_time'), { opponent: null }, NOW).headline).toContain('your opponent');
  });

  it('labels the agenda buttons for time actions', () => {
    expect(actionLabel('propose_time')).toBe('Pick a time');
    expect(actionLabel('respond_time')).toBe('Respond');
    expect(actionLabel('wait_time')).toBe('Open room');
  });
});
