import type { UserProfile } from '@/types/auth';
import { hasProfileCountryCode, hasProfileDateOfBirth } from '@/utils/profileFields';

function isExemptRoute(pathname: string): boolean {
  return pathname.startsWith('/auth/') || pathname === '/suspended';
}

export function shouldPromptProfileCompletion(
  pathname: string,
  profile: Pick<UserProfile, 'date_of_birth' | 'is_suspended'> | null,
  hasUser: boolean,
  loading: boolean,
): boolean {
  if (loading || !hasUser || !profile) return false;
  if (profile.is_suspended) return false;
  if (isExemptRoute(pathname)) return false;
  if (hasProfileDateOfBirth(profile)) return false;
  return true;
}

export function profileNeedsCountryInCompletion(
  profile: Pick<UserProfile, 'country_code' | 'date_of_birth'> | null,
): boolean {
  if (!profile || hasProfileDateOfBirth(profile)) return false;
  return !hasProfileCountryCode(profile);
}
