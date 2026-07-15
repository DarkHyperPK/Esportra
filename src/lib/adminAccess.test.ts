import { describe, expect, it } from 'vitest';
import { isSuperAdminFromProfile, isSuperAdminUser } from '@/lib/adminAccess';

describe('adminAccess', () => {
  it('detects super admin from profile fallback', () => {
    expect(isSuperAdminFromProfile({
      is_admin: true,
      admin_roles: ['super_admin'],
    })).toBe(true);
  });

  it('detects super admin from API roles while profile sync lags', () => {
    expect(isSuperAdminUser(
      { isAdmin: false, roles: [] },
      { is_admin: true, admin_roles: ['super_admin'] },
    )).toBe(true);
  });

  it('detects super admin from loaded admin context', () => {
    expect(isSuperAdminUser(
      { isAdmin: true, roles: ['super_admin'] },
      { is_admin: false, admin_roles: [] },
    )).toBe(true);
  });
});
