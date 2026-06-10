import type { UserProfile, UserRole } from '@/types/auth';

type ApiProfile = Record<string, unknown>;

export function readProfileDateOfBirth(profile: ApiProfile | UserProfile | null | undefined): string | null {
  if (!profile) return null;
  const value = profile.date_of_birth ?? (profile as ApiProfile).dateOfBirth;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readProfileCountryCode(profile: ApiProfile | UserProfile | null | undefined): string | null {
  if (!profile) return null;
  const value = profile.country_code ?? (profile as ApiProfile).countryCode;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeProfileFromApi(data: ApiProfile, userId: string): UserProfile {
  const role = (data.role ?? data.base_role ?? 'casual') as UserRole;

  return {
    ...(data as UserProfile),
    id: (data.id as string | undefined) ?? userId,
    email: (data.email as string | null | undefined) ?? null,
    role,
    date_of_birth: readProfileDateOfBirth(data),
    country_code: readProfileCountryCode(data),
  };
}

export function hasProfileDateOfBirth(profile: ApiProfile | UserProfile | null | undefined): boolean {
  return readProfileDateOfBirth(profile) !== null;
}

export function hasProfileCountryCode(profile: ApiProfile | UserProfile | null | undefined): boolean {
  return readProfileCountryCode(profile) !== null;
}
