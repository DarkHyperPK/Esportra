import { describe, expect, it } from 'vitest';
import {
  hasProfileDateOfBirth,
  normalizeProfileFromApi,
  readProfileDateOfBirth,
} from './profileFields';

describe('profileFields', () => {
  it('reads date of birth from camelCase API payloads', () => {
    expect(readProfileDateOfBirth({ dateOfBirth: '2000-02-08' })).toBe('2000-02-08');
  });

  it('reads date of birth from snake_case API payloads', () => {
    expect(readProfileDateOfBirth({ date_of_birth: '2000-02-08' })).toBe('2000-02-08');
  });

  it('normalizes profile fields for auth context gating', () => {
    const profile = normalizeProfileFromApi(
      { id: 'user-1', dateOfBirth: '2000-02-08', countryCode: 'PK' },
      'user-1',
    );

    expect(profile.date_of_birth).toBe('2000-02-08');
    expect(profile.country_code).toBe('PK');
    expect(hasProfileDateOfBirth(profile)).toBe(true);
  });
});
