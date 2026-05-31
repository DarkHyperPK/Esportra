import { describe, expect, it } from 'vitest';

/** Mirrors BRLeaderboard qualification guard — avoids React rendering `{0 && ...}`. */
function hasQualificationCutoff(cutoff: number | undefined): boolean {
  return typeof cutoff === 'number' && cutoff > 0;
}

describe('BRLeaderboard qualification cutoff guard', () => {
  it('treats advancement_count 0 as disabled (prevents orphan "0" text nodes)', () => {
    expect(hasQualificationCutoff(0)).toBe(false);
    expect(hasQualificationCutoff(undefined)).toBe(false);
    expect(hasQualificationCutoff(4)).toBe(true);
  });
});
