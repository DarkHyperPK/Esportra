import { describe, expect, it } from 'vitest';
import { buildLifecycleSteps, phaseTone, resolveDashboardPhase } from '../lifecycle';

const states = (steps: ReturnType<typeof buildLifecycleSteps>) => steps.map((s) => `${s.id}:${s.state}`);

describe('buildLifecycleSteps', () => {
  it('skips the check-in step when check-in is not required', () => {
    expect(buildLifecycleSteps('registration_open', false).map((s) => s.id))
      .toEqual(['draft', 'registration', 'live', 'completed']);
  });

  it('marks earlier steps done and the current one current', () => {
    expect(states(buildLifecycleSteps('live', true))).toEqual([
      'draft:done', 'registration:done', 'check_in:done', 'live:current', 'completed:upcoming',
    ]);
  });

  it('marks every step done once completed', () => {
    expect(buildLifecycleSteps('completed', false).every((s) => s.state === 'done')).toBe(true);
  });

  it('leaves a cancelled event with no current step', () => {
    expect(buildLifecycleSteps('cancelled', false).every((s) => s.state === 'upcoming')).toBe(true);
  });
});

describe('resolveDashboardPhase', () => {
  it('promotes registration to check-in while the window is open', () => {
    expect(resolveDashboardPhase('registration_open', true)).toBe('check_in');
  });

  it('never overrides live, draft or completed', () => {
    expect(resolveDashboardPhase('live', true)).toBe('live');
    expect(resolveDashboardPhase('draft', true)).toBe('draft');
    expect(resolveDashboardPhase('completed', true)).toBe('completed');
  });
});

describe('phaseTone', () => {
  it('uses semantic tones', () => {
    expect(phaseTone('registration_open')).toBe('success');
    expect(phaseTone('live')).toBe('accent');
    expect(phaseTone('cancelled')).toBe('critical');
    expect(phaseTone('draft')).toBe('neutral');
  });
});
