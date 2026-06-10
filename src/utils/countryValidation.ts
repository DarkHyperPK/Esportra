import { countries } from '@/utils/countries';

const VALID_COUNTRY_CODES = new Set(countries.map((country) => country.code));

export type CountryValidationResult = {
  valid: boolean;
  error?: string;
  normalized?: string;
};

export function validateCountryCode(value: string): CountryValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, error: 'Country is required.' };
  }

  const normalized = trimmed.toUpperCase();
  if (!VALID_COUNTRY_CODES.has(normalized)) {
    return { valid: false, error: 'Please select a valid country.' };
  }

  return { valid: true, normalized };
}

export function isValidCountryCode(value: string | null | undefined): boolean {
  if (!value) return false;
  return VALID_COUNTRY_CODES.has(value.toUpperCase());
}
