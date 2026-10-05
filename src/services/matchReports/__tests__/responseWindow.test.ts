import { describe, expect, it } from 'vitest';
import { acceptedLabel, formatCountdown, responseWindowText, secondsLeft } from '../responseWindow';

describe('report response window', () => {
  const now = Date.parse('2026-10-05T12:00:00Z');

  it('counts down to the deadline and stops at zero', () => {
    expect(secondsLeft('2026-10-05T12:15:00Z', now)).toBe(900);
    expect(secondsLeft('2026-10-05T11:59:00Z', now)).toBe(0);
    expect(formatCountdown(724)).toBe('12:04');
  });

  it('tells each side what happens when it runs out', () => {
    expect(responseWindowText(724, false, 'Bravo')).toBe("Accept or dispute within 12:04. After that it's accepted automatically.");
    expect(responseWindowText(724, true, 'Bravo')).toContain('Bravo has 12:04');
    expect(responseWindowText(0, true, 'Bravo')).toContain('accepted automatically');
  });

  it('labels how a result was accepted', () => {
    expect(acceptedLabel('timeout')).toContain('no response');
    expect(acceptedLabel('riot_confirmed')).toContain('Riot');
    expect(acceptedLabel(null)).toBe('Verified');
  });
});
