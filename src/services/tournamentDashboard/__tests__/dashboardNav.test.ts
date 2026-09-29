import { describe, expect, it } from 'vitest';
import {
  buildDashboardNav,
  listReachableTargets,
  listVisibleSections,
  resolveActiveSection,
  resolveDefaultSection,
  type DashboardNavContext,
} from '../dashboardNav';

const owner: DashboardNavContext = {
  slug: 'spring-cup',
  isBR: false,
  isPaid: true,
  canActAsOwner: true,
  canManageTeams: true,
  canAssistDisputes: true,
  canSendAnnouncements: true,
  canEditBracket: true,
  canManageStaff: true,
  disputeBadgeCount: 0,
};

const scoreStaff: DashboardNavContext = {
  ...owner,
  canActAsOwner: false,
  canManageTeams: false,
  canAssistDisputes: false,
  canSendAnnouncements: false,
  canManageStaff: false,
};

describe('buildDashboardNav', () => {
  it('groups an owner nav into run, community and configure', () => {
    const groups = buildDashboardNav(owner);
    expect(groups.map((g) => g.id)).toEqual(['run', 'community', 'configure']);
    expect(listVisibleSections(groups)).toEqual([
      'overview', 'participants', 'payments', 'format-stages', 'schedule', 'standings',
      'invitations', 'announcements', 'bans',
      'basic-info', 'branding', 'prize-payouts', 'registration', 'staff', 'settings',
    ]);
  });

  it('marks brackets and disputes as links that leave the page', () => {
    const links = buildDashboardNav(owner)
      .flatMap((g) => g.items)
      .filter((item) => item.kind === 'link')
      .map((item) => item.id);
    expect(links).toEqual(['brackets', 'disputes']);
  });

  it('hides payments for free tournaments', () => {
    const sections = listVisibleSections(buildDashboardNav({ ...owner, isPaid: false }));
    expect(sections).not.toContain('payments');
  });

  it('never shows owner-only or ungranted panels to staff', () => {
    const sections = listVisibleSections(buildDashboardNav(scoreStaff));
    expect(sections).toEqual(['overview', 'participants', 'format-stages', 'schedule']);
  });

  it('drops groups that end up empty', () => {
    expect(buildDashboardNav(scoreStaff).map((g) => g.id)).toEqual(['run']);
  });

  it('swaps brackets for games in battle royale', () => {
    const ids = buildDashboardNav({ ...owner, isBR: true }).flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('games');
    expect(ids).not.toContain('brackets');
  });

  it('carries the dispute badge only when there is something pending', () => {
    const find = (count: number) => buildDashboardNav({ ...owner, disputeBadgeCount: count })
      .flatMap((g) => g.items)
      .find((i) => i.id === 'disputes');
    expect(find(0)).toMatchObject({ badge: undefined });
    expect(find(3)).toMatchObject({ badge: 3 });
  });
});

describe('resolveDefaultSection', () => {
  const ownerSections = listVisibleSections(buildDashboardNav(owner));

  it('opens drafts on basic info', () => {
    expect(resolveDefaultSection('draft', ownerSections)).toBe('basic-info');
  });

  it('opens live tournaments on the overview', () => {
    expect(resolveDefaultSection('open', ownerSections)).toBe('overview');
    expect(resolveDefaultSection('ongoing', ownerSections)).toBe('overview');
  });

  it('falls back to overview when basic info is not visible', () => {
    const staffSections = listVisibleSections(buildDashboardNav(scoreStaff));
    expect(resolveDefaultSection('draft', staffSections)).toBe('overview');
  });
});

describe('resolveActiveSection', () => {
  const visible = listVisibleSections(buildDashboardNav(scoreStaff));

  it('keeps an allowed panel', () => {
    expect(resolveActiveSection('schedule', visible)).toBe('schedule');
  });

  it('falls back for unknown or forbidden panels', () => {
    expect(resolveActiveSection('settings', visible)).toBe('overview');
    expect(resolveActiveSection('nope', visible, 'participants')).toBe('participants');
    expect(resolveActiveSection(null, visible)).toBe('overview');
  });

  it('maps the legacy advanced tab to settings', () => {
    const ownerVisible = listVisibleSections(buildDashboardNav(owner));
    expect(resolveActiveSection('advanced', ownerVisible)).toBe('settings');
  });
});

describe('listReachableTargets', () => {
  it('includes both panels and links', () => {
    const reachable = listReachableTargets(buildDashboardNav(owner));
    expect(reachable.has('disputes')).toBe(true);
    expect(reachable.has('basic-info')).toBe(true);
  });
});
