import { describe, expect, it } from 'vitest';
import { calculateAge, validateDateOfBirth } from './dobValidation';

describe('validateDateOfBirth', () => {
  it('rejects empty values', () => {
    expect(validateDateOfBirth('').valid).toBe(false);
  });

  it('rejects invalid calendar dates', () => {
    expect(validateDateOfBirth('2024-02-31').valid).toBe(false);
  });

  it('rejects users younger than 13', () => {
    const today = new Date();
    const tooYoung = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
    const iso = tooYoung.toISOString().split('T')[0];
    expect(validateDateOfBirth(iso).valid).toBe(false);
  });

  it('accepts a valid adult date of birth', () => {
    const result = validateDateOfBirth('1995-06-15');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('1995-06-15');
  });
});

describe('calculateAge', () => {
  it('accounts for birthdays that have not occurred yet this year', () => {
    const reference = new Date(2026, 5, 10);
    const birth = new Date(2000, 11, 25);
    expect(calculateAge(birth, reference)).toBe(25);
  });
});
