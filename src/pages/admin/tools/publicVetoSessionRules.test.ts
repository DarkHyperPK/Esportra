import { describe, expect, it } from 'vitest';
import { vetoUsageRates, vetoPageDescription, vetoStatus, formatVetoTimestamp } from './publicVetoSessionRules';
describe('public veto presentation rules', () => {
  it('uses global filtered counters, including zero denominator', () => {
    expect(vetoUsageRates({ totalSessions: 200, completedSessions: 50, overlaySessions: 20 })).toEqual({ completion: '25.0%', overlay: '10.0%' });
    expect(vetoUsageRates({ totalSessions: 0, completedSessions: 0, overlaySessions: 0 })).toEqual({ completion: '0.0%', overlay: '0.0%' });
  });
  it('describes full and final pages accurately', () => {
    expect(vetoPageDescription(1, 50, 312)).toBe('Showing 1–50 of 312');
    expect(vetoPageDescription(7, 50, 312)).toBe('Showing 301–312 of 312');
    expect(vetoPageDescription(1, 50, 0)).toBe('Showing 0 of 0');
  });
  it('labels statuses semantically and retains unknown state', () => {
    expect(vetoStatus('completed')).toEqual({ label: 'Completed', tone: 'success' });
    expect(vetoStatus('new_state')).toEqual({ label: 'new state', tone: 'neutral' });
  });
  it('does not render invalid or missing dates as a real timestamp', () => {
    expect(formatVetoTimestamp(null)).toBeNull();
    expect(formatVetoTimestamp('invalid')).toBeNull();
    expect(formatVetoTimestamp('2026-10-11T12:00:00Z')?.zone).toBeTruthy();
  });
});
