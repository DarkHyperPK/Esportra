import { beforeEach, describe, expect, it } from 'vitest';
import type { UserRole } from '@/contexts/role-context';
import {
  clearAllStoredSessionRoles,
  getSessionRoleKey,
  getStoredSessionRole,
  resolveActiveRole,
  setStoredSessionRole,
  syncStoredSessionRole,
  userHasActiveRole,
} from '@/lib/sessionRole';

const USER_ID = '11111111-1111-1111-1111-111111111111';

describe('sessionRole', () => {
  beforeEach(() => {
    clearAllStoredSessionRoles();
    localStorage.removeItem('sessionRole');
  });

  it('stores and reads a per-user session role', () => {
    setStoredSessionRole(USER_ID, 'organizer');
    expect(getStoredSessionRole(USER_ID)).toBe('organizer');
    expect(localStorage.getItem(getSessionRoleKey(USER_ID))).toBe('organizer');
  });

  it('migrates the legacy global sessionRole key once', () => {
    localStorage.setItem('sessionRole', 'venue_owner');
    expect(getStoredSessionRole(USER_ID)).toBe('venue_owner');
    expect(localStorage.getItem('sessionRole')).toBeNull();
    expect(getStoredSessionRole(USER_ID)).toBe('venue_owner');
  });

  it('keeps an explicit stored session role over server defaults', () => {
    expect(
      resolveActiveRole({
        storedSessionRole: 'venue_owner',
        userRoles: [
          { role: 'organizer', is_active: true },
          { role: 'venue_owner', is_active: true },
        ],
        profileRole: 'casual',
      }),
    ).toBe('venue_owner');
  });

  it('initializes from the first active server role when no session role exists', () => {
    expect(
      resolveActiveRole({
        storedSessionRole: null,
        userRoles: [
          { role: 'organizer', is_active: true },
          { role: 'venue_owner', is_active: true },
        ],
        profileRole: 'casual',
      }),
    ).toBe('organizer');
  });

  it('downgrades a revoked privileged role to casual instead of another role', () => {
    expect(
      resolveActiveRole({
        storedSessionRole: 'venue_owner',
        userRoles: [{ role: 'organizer', is_active: true }],
        profileRole: 'casual',
      }),
    ).toBe('casual');
  });

  it('detects inactive assignments', () => {
    expect(userHasActiveRole([{ role: 'organizer', is_active: false }], 'organizer')).toBe(false);
    expect(userHasActiveRole([{ role: 'organizer', isActive: true }], 'organizer')).toBe(true);
  });

  it('only persists when the resolved role changes', () => {
    const previous: UserRole = 'organizer';
    setStoredSessionRole(USER_ID, previous);
    syncStoredSessionRole(USER_ID, previous, 'organizer');
    expect(getStoredSessionRole(USER_ID)).toBe('organizer');

    syncStoredSessionRole(USER_ID, previous, 'casual');
    expect(getStoredSessionRole(USER_ID)).toBe('casual');
  });
});
