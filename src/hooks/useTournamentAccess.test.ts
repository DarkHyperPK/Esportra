import { describe, expect, it } from 'vitest';
import {
  canAccessPermission,
  hasStaffOnlyAccess,
  hasTournamentAccess,
  isStaffAdmin,
  type TournamentAccess,
} from '@/types/staff';

const assignedAccess: TournamentAccess = {
  tournamentId: 't-1',
  role: 'assigned',
  permissions: ['scores:update', 'bracket:edit'],
  isOrganizer: false,
  isPlatformAdmin: false,
};

const orgAdminStaffAccess: TournamentAccess = {
  tournamentId: 't-2',
  role: 'admin',
  permissions: ['scores:update', 'teams:manage', 'bracket:edit', 'announcements:send', 'disputes:assist'],
  isOrganizer: false,
  isPlatformAdmin: false,
};

const organizerAccess: TournamentAccess = {
  tournamentId: 't-3',
  role: 'admin',
  permissions: ['scores:update', 'teams:manage', 'bracket:edit', 'announcements:send', 'disputes:assist'],
  isOrganizer: true,
  isPlatformAdmin: false,
};

describe('tournament access helpers', () => {
  it('hasTournamentAccess is true for assigned and admin roles', () => {
    expect(hasTournamentAccess(assignedAccess)).toBe(true);
    expect(hasTournamentAccess(orgAdminStaffAccess)).toBe(true);
    expect(hasTournamentAccess({ ...assignedAccess, role: 'none', permissions: [] })).toBe(false);
  });

  it('hasStaffOnlyAccess excludes direct organizers', () => {
    expect(hasStaffOnlyAccess(assignedAccess)).toBe(true);
    expect(hasStaffOnlyAccess(orgAdminStaffAccess)).toBe(true);
    expect(hasStaffOnlyAccess(organizerAccess)).toBe(false);
  });

  it('isStaffAdmin identifies org staff admins only', () => {
    expect(isStaffAdmin(orgAdminStaffAccess)).toBe(true);
    expect(isStaffAdmin(assignedAccess)).toBe(false);
    expect(isStaffAdmin(organizerAccess)).toBe(false);
  });

  it('canAccessPermission respects scoped permissions', () => {
    expect(canAccessPermission(assignedAccess, 'bracket:edit')).toBe(true);
    expect(canAccessPermission(assignedAccess, 'disputes:assist')).toBe(false);
    expect(canAccessPermission(orgAdminStaffAccess, 'disputes:assist')).toBe(true);
    expect(canAccessPermission(organizerAccess, 'disputes:assist')).toBe(true);
  });
});
