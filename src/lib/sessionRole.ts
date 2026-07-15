import type { UserRole } from '@/contexts/role-context';
import type { MeRoleAssignment } from '@/lib/meRoles';

const SESSION_ROLE_PREFIX = 'esportra_session_role_';
const LEGACY_SESSION_ROLE_KEY = 'sessionRole';

const VALID_SESSION_ROLES: UserRole[] = ['casual', 'organizer', 'venue_owner', 'admin'];

export const PLAYER_SESSION_ROLES = ['casual', 'organizer', 'venue_owner'] as const;

export type PlayerSessionRole = (typeof PLAYER_SESSION_ROLES)[number];

export function isValidSessionRole(value: string | null | undefined): value is UserRole {
  return !!value && VALID_SESSION_ROLES.includes(value as UserRole);
}

export function isPlayerSessionRole(role: UserRole | null | undefined): role is PlayerSessionRole {
  return !!role && PLAYER_SESSION_ROLES.includes(role as PlayerSessionRole);
}

export function getSessionRoleKey(userId: string): string {
  return `${SESSION_ROLE_PREFIX}${userId}`;
}

/** Read per-user session role, migrating the legacy global key once. */
export function getStoredSessionRole(userId: string | undefined | null): UserRole | null {
  if (!userId || typeof window === 'undefined') return null;

  const scoped = localStorage.getItem(getSessionRoleKey(userId));
  if (isValidSessionRole(scoped)) return scoped;

  const legacy = localStorage.getItem(LEGACY_SESSION_ROLE_KEY);
  if (isValidSessionRole(legacy)) {
    localStorage.setItem(getSessionRoleKey(userId), legacy);
    localStorage.removeItem(LEGACY_SESSION_ROLE_KEY);
    return legacy;
  }

  return null;
}

export function setStoredSessionRole(userId: string, role: UserRole): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getSessionRoleKey(userId), role);
  localStorage.removeItem(LEGACY_SESSION_ROLE_KEY);
}

export function clearStoredSessionRole(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getSessionRoleKey(userId));
}

/** Clear all session-role keys (sign-out / account switch). */
export function clearAllStoredSessionRoles(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(LEGACY_SESSION_ROLE_KEY);
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(SESSION_ROLE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}

export function userHasActiveRole(
  userRoles: MeRoleAssignment[] | undefined,
  role: string,
): boolean {
  return (userRoles ?? []).some(
    (entry) =>
      entry.role === role &&
      (entry.is_active ?? entry.isActive ?? true),
  );
}

/**
 * Resolve the active UI role without clobbering an explicit session pick.
 * Stored session role wins; revoked privileged roles downgrade to casual.
 */
export function resolveActiveRole(options: {
  storedSessionRole: UserRole | null;
  userRoles: MeRoleAssignment[] | undefined;
  profileRole?: UserRole | null;
}): UserRole {
  const { storedSessionRole, userRoles, profileRole } = options;

  if (isPlayerSessionRole(storedSessionRole)) {
    if (
      storedSessionRole === 'casual' ||
      userHasActiveRole(userRoles, storedSessionRole)
    ) {
      return storedSessionRole;
    }
    return 'casual';
  }

  if ((userRoles ?? []).length > 0) {
    return userRoles![0].role as UserRole;
  }

  return profileRole ?? 'casual';
}

/** Persist resolved role when initializing or when access was revoked. */
export function syncStoredSessionRole(
  userId: string,
  previousRole: UserRole | null,
  resolvedRole: UserRole,
): void {
  if (!previousRole || resolvedRole !== previousRole) {
    setStoredSessionRole(userId, resolvedRole);
  }
}
