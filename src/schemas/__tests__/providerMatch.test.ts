import { describe, expect, it } from 'vitest';
import { providerMatchSchema } from '../providerMatch';

describe('providerMatchSchema', () => {
  it('accepts what the API sends and drops unknown fields', () => {
    const parsed = providerMatchSchema.parse({
      status: 'verified', reasons: [], match: { dataStatus: 'retrieved', map: 'Ascent' },
      players: [{ isRosterMember: true, kills: 20 }], teams: [],
    });
    expect(parsed.players).toEqual([{ isRosterMember: true }]);
    expect(parsed.match).toEqual({ dataStatus: 'retrieved' });
  });

  it('defaults missing reasons and accepts "none" without a match', () => {
    expect(providerMatchSchema.parse({ status: 'none' })).toMatchObject({ status: 'none', reasons: [] });
  });

  it('rejects a status the app does not know', () => {
    expect(providerMatchSchema.safeParse({ status: 'great', reasons: [] }).success).toBe(false);
  });
});
