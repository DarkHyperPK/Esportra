const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const MIN_AGE_YEARS = 13;
export const MAX_AGE_YEARS = 120;

export type DobValidationResult = {
  valid: boolean;
  error?: string;
  normalized?: string;
};

export function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE_REGEX.test(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function calculateAge(birth: Date, reference = new Date()): number {
  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
}

export function validateDateOfBirth(value: string): DobValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, error: 'Date of birth is required.' };
  }

  const parsed = parseIsoDate(trimmed);
  if (!parsed) {
    return { valid: false, error: 'Enter a valid date (YYYY-MM-DD).' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parsed > today) {
    return { valid: false, error: 'Date of birth cannot be in the future.' };
  }

  const age = calculateAge(parsed, today);
  if (age < MIN_AGE_YEARS) {
    return { valid: false, error: 'You must be at least 13 years old.' };
  }

  if (age > MAX_AGE_YEARS) {
    return { valid: false, error: 'Please enter a valid date of birth.' };
  }

  return { valid: true, normalized: trimmed };
}

export function maxDateOfBirthInputValue(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split('T')[0];
}
