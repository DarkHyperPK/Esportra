export type StaffPermission =
  | 'scores:update'
  | 'teams:manage'
  | 'bracket:edit'
  | 'announcements:send'
  | 'disputes:assist';

export type StaffRole = 'admin' | 'assigned' | 'none';

export interface TournamentAccess {
  tournamentId: string;
  role: StaffRole;
  permissions: StaffPermission[];
  isOrganizer: boolean;
  isPlatformAdmin: boolean;
}

export function hasTournamentAccess(access: TournamentAccess | undefined): boolean {
  return Boolean(access && access.role !== 'none');
}

/** Staff access excluding direct organizer/org-owner (player-session staff gate). */
export function hasStaffOnlyAccess(access: TournamentAccess | undefined): boolean {
  return Boolean(access && !access.isOrganizer && access.role !== 'none');
}

export function isStaffAdmin(access: TournamentAccess | undefined): boolean {
  return access?.role === 'admin' && !access.isOrganizer;
}

export function canAccessPermission(
  access: TournamentAccess | undefined,
  permission: StaffPermission,
): boolean {
  if (!access || access.role === 'none') return false;
  if (access.isOrganizer || access.isPlatformAdmin || access.role === 'admin') return true;
  return access.permissions.includes(permission);
}
