/**
 * Tournament dashboard navigation model.
 *
 * Single source of truth for which panels an actor can open and how they are
 * grouped. The desktop rail and the mobile drawer both render from this.
 */

export type DashboardSectionId =
  | 'overview'
  | 'participants'
  | 'payments'
  | 'format-stages'
  | 'games'
  | 'schedule'
  | 'standings'
  | 'invitations'
  | 'announcements'
  | 'bans'
  | 'basic-info'
  | 'branding'
  | 'prize-payouts'
  | 'registration'
  | 'staff'
  | 'settings';

export type DashboardLinkId = 'brackets' | 'disputes';

export type DashboardGroupId = 'run' | 'community' | 'configure';

export interface DashboardTabItem {
  kind: 'tab';
  id: DashboardSectionId;
  label: string;
}

export interface DashboardLinkItem {
  kind: 'link';
  id: DashboardLinkId;
  label: string;
  href: string;
  badge?: number;
}

export type DashboardNavItem = DashboardTabItem | DashboardLinkItem;

export interface DashboardNavGroup {
  id: DashboardGroupId;
  label: string;
  items: DashboardNavItem[];
}

export interface DashboardNavContext {
  slug: string;
  isBR: boolean;
  isPaid: boolean;
  canActAsOwner: boolean;
  canManageTeams: boolean;
  canAssistDisputes: boolean;
  canSendAnnouncements: boolean;
  canEditBracket: boolean;
  canManageStaff: boolean;
  disputeBadgeCount: number;
}

const tab = (id: DashboardSectionId, label: string): DashboardTabItem => ({ kind: 'tab', id, label });

const compact = (items: Array<DashboardNavItem | null>): DashboardNavItem[] =>
  items.filter((item): item is DashboardNavItem => item !== null);

function buildRunGroup(ctx: DashboardNavContext): DashboardNavItem[] {
  return compact([
    tab('overview', 'Overview'),
    tab('participants', 'Participants'),
    ctx.isPaid && ctx.canManageTeams ? tab('payments', 'Payments') : null,
    ctx.canEditBracket ? tab('format-stages', 'Format & stages') : null,
    !ctx.isBR && ctx.canEditBracket
      ? { kind: 'link', id: 'brackets', label: 'Brackets', href: `/tournaments/${ctx.slug}/brackets` }
      : null,
    ctx.isBR ? tab('games', 'Games') : null,
    ctx.canEditBracket ? tab('schedule', 'Schedule') : null,
    ctx.canActAsOwner ? tab('standings', 'Standings') : null,
  ]);
}

function buildCommunityGroup(ctx: DashboardNavContext): DashboardNavItem[] {
  return compact([
    ctx.canManageTeams ? tab('invitations', 'Invitations') : null,
    ctx.canSendAnnouncements ? tab('announcements', 'Announcements') : null,
    ctx.canManageTeams ? tab('bans', 'Bans') : null,
    ctx.canAssistDisputes
      ? {
        kind: 'link',
        id: 'disputes',
        label: 'Disputes',
        href: `/organizer/tournament/${ctx.slug}/disputes?returnTo=/organizer/tournament/${ctx.slug}`,
        badge: ctx.disputeBadgeCount > 0 ? ctx.disputeBadgeCount : undefined,
      }
      : null,
  ]);
}

function buildConfigureGroup(ctx: DashboardNavContext): DashboardNavItem[] {
  if (!ctx.canActAsOwner) return [];
  return compact([
    tab('basic-info', 'Basic info'),
    tab('branding', 'Branding'),
    tab('prize-payouts', 'Prize & payouts'),
    tab('registration', 'Registration'),
    ctx.canManageStaff ? tab('staff', 'Staff') : null,
    tab('settings', 'Match settings'),
  ]);
}

export function buildDashboardNav(ctx: DashboardNavContext): DashboardNavGroup[] {
  const groups: DashboardNavGroup[] = [
    { id: 'run', label: 'Run', items: buildRunGroup(ctx) },
    { id: 'community', label: 'Community', items: buildCommunityGroup(ctx) },
    { id: 'configure', label: 'Configure', items: buildConfigureGroup(ctx) },
  ];
  return groups.filter((group) => group.items.length > 0);
}

export function listVisibleSections(groups: DashboardNavGroup[]): DashboardSectionId[] {
  return groups.flatMap((group) =>
    group.items.flatMap((item) => (item.kind === 'tab' ? [item.id] : [])),
  );
}

/** Every id (panel or link) the actor can reach from the nav. */
export function listReachableTargets(groups: DashboardNavGroup[]): Set<string> {
  return new Set(groups.flatMap((group) => group.items.map((item) => item.id)));
}

/**
 * New drafts with no stages land on Format & Stages so the organizer
 * knows the first thing to configure. Other drafts land on Basic info.
 * Live events land on Overview where the action queue lives.
 */
export function resolveDefaultSection(
  status: string,
  visible: DashboardSectionId[],
  stageCount: number,
): DashboardSectionId {
  if (status === 'draft' && stageCount === 0 && visible.includes('format-stages')) return 'format-stages';
  if (status === 'draft' && visible.includes('basic-info')) return 'basic-info';
  return 'overview';
}

/** Falls back to the default panel when the requested one is unknown or not allowed. */
export function resolveActiveSection(
  requested: string | null | undefined,
  visible: DashboardSectionId[],
  fallback: DashboardSectionId = 'overview',
): DashboardSectionId {
  const normalized = requested === 'advanced' ? 'settings' : requested;
  const match = visible.find((id) => id === normalized);
  return match ?? fallback;
}
