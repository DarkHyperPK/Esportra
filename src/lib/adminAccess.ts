/** Shared super-admin detection — API roles are authoritative; profile is fallback while loading. */

export interface AdminAccessSnapshot {
  isAdmin: boolean;
  roles: string[];
}

export interface ProfileAdminFields {
  is_admin?: boolean | null;
  admin_roles?: string[] | null;
}

export function isSuperAdminFromProfile(profile: ProfileAdminFields | null | undefined): boolean {
  if (!profile?.is_admin) return false;
  const roles = profile.admin_roles ?? [];
  return roles.some((role) => role.toLowerCase() === 'super_admin');
}

export function isSuperAdminUser(
  admin: AdminAccessSnapshot,
  profile?: ProfileAdminFields | null,
): boolean {
  if (admin.roles.some((role) => role.toLowerCase() === 'super_admin')) return true;
  return isSuperAdminFromProfile(profile);
}

export function isPlatformAdminUser(
  admin: AdminAccessSnapshot,
  profile?: ProfileAdminFields | null,
): boolean {
  if (isSuperAdminUser(admin, profile)) return true;
  return admin.isAdmin && admin.roles.length > 0;
}
