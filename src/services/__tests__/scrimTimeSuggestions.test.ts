import { describe, expect, it } from 'vitest';
import { labelSuggestion, suggestMatchTimes } from '../scrimTimeSuggestions';

// Monday 2 Nov 2026
const at = (day: number, hour: number, min = 0) => new Date(2026, 10, day, hour, min);

describe('suggestMatchTimes', () => {
  it('offers this evening and the next few, soonest first, never more than asked for', () => {
    const out = suggestMatchTimes(at(2, 15, 0), 6);
    expect(out).toHaveLength(6);
    expect(out.map((d) => d.getHours())).toEqual([19, 20, 21, 19, 20, 21]);
    expect(out[0].getDate()).toBe(2);
    expect(out[3].getDate()).toBe(3);
    expect(out.every((d, i) => i === 0 || d.getTime() > out[i - 1].getTime())).toBe(true);
  });

  it('skips evening slots that are too soon or already past', () => {
    // 19:45 now: 19:00 is past and 20:00 is under the 30 minute lead.
    const out = suggestMatchTimes(at(2, 19, 45), 3);
    expect(out[0].getHours()).toBe(21);
    expect(out[0].getDate()).toBe(2);
  });

  it('rolls over to tomorrow late in the evening', () => {
    const out = suggestMatchTimes(at(2, 22, 30), 3);
    expect(out.every((d) => d.getDate() === 3)).toBe(true);
  });

  it('returns whole-hour times with no seconds', () => {
    for (const d of suggestMatchTimes(at(2, 8, 17), 6)) {
      expect([d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([0, 0, 0]);
    }
  });
});

describe('labelSuggestion', () => {
  it('says Today and Tomorrow, then the weekday', () => {
    const now = at(2, 15);
    expect(labelSuggestion(at(2, 20), now)).toMatch(/^Today /);
    expect(labelSuggestion(at(3, 20), now)).toMatch(/^Tomorrow /);
    expect(labelSuggestion(at(5, 20), now)).toMatch(/^Thu /);
  });
  it('includes the time', () => {
    expect(labelSuggestion(at(2, 20), at(2, 15))).toMatch(/8:00/);
  });
});
