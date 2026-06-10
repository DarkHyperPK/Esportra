import { describe, expect, it } from 'vitest';
import {
  profileNeedsCountryInCompletion,
  shouldPromptProfileCompletion,
} from './profileCompletion';

describe('shouldPromptProfileCompletion', () => {
  it('prompts only when DOB is missing for signed-in users', () => {
    expect(
      shouldPromptProfileCompletion('/', { date_of_birth: null, is_suspended: false }, true, false),
    ).toBe(true);
  });

  it('does not prompt when DOB already exists', () => {
    expect(
      shouldPromptProfileCompletion('/', { date_of_birth: '1995-01-01', is_suspended: false }, true, false),
    ).toBe(false);
  });

  it('does not prompt on auth routes', () => {
    expect(
      shouldPromptProfileCompletion('/auth/signin', { date_of_birth: null, is_suspended: false }, true, false),
    ).toBe(false);
  });
});

describe('profileNeedsCountryInCompletion', () => {
  it('requires country only during DOB backfill when country is missing', () => {
    expect(profileNeedsCountryInCompletion({ date_of_birth: null, country_code: null })).toBe(true);
    expect(profileNeedsCountryInCompletion({ date_of_birth: null, country_code: 'PK' })).toBe(false);
    expect(profileNeedsCountryInCompletion({ date_of_birth: '1995-01-01', country_code: null })).toBe(false);
  });
});
