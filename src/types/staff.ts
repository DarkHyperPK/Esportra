export type StaffPermission =
  | 'scores:update'
  | 'teams:manage'
  | 'bracket:edit'
  | 'announcements:send'
  | 'disputes:assist';

export const STAFF_PERMISSION_OPTIONS: {
  id: StaffPermission;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 'scores:update',
    label: 'Update Scores',
    shortLabel: 'Scores',
    description: 'Report and update match scores',
  },
  {
    id: 'teams:manage',
    label: 'Manage Teams',
    shortLabel: 'Teams',
    description: 'Approve rosters, check-ins, and team changes',
  },
  {
    id: 'bracket:edit',
    label: 'Edit Brackets',
    shortLabel: 'Brackets',
    description: 'Edit brackets, schedules, and stage settings',
  },
  {
    id: 'announcements:send',
    label: 'Send Announcements',
    shortLabel: 'Announce',
    description: 'Post tournament announcements',
  },
  {
    id: 'disputes:assist',
    label: 'Assist Disputes',
    shortLabel: 'Disputes',
    description: 'View and assist with match disputes',
  },
];

export const ALL_STAFF_PERMISSIONS: StaffPermission[] = STAFF_PERMISSION_OPTIONS.map((p) => p.id);

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
