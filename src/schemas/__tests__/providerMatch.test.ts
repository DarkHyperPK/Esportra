import { describe, expect, it } from 'vitest';
import { analyticsVisibilityRequestSchema, analyticsVisibilitySchema, providerMatchSchema } from '../providerMatch';

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

describe('analytics visibility schemas', () => {
  it('only allows private or public', () => {
    expect(analyticsVisibilitySchema.safeParse({ game: 'valorant', visibility: 'friends' }).success).toBe(false);
    expect(analyticsVisibilityRequestSchema.safeParse({ game: 'valorant', visibility: 'public' }).success).toBe(true);
  });

  it('rejects a game slug the API would refuse', () => {
    expect(analyticsVisibilityRequestSchema.safeParse({ game: 'Bad Game!', visibility: 'public' }).success).toBe(false);
  });
});
