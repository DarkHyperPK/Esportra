import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, Crosshair, ClipboardList, Trophy, MapPin, BarChart2,
  ChevronLeft, ChevronDown, Check, Bell, LogOut, ArrowRightLeft,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useAdmin } from '@/hooks/useAdmin';
import { useOrgStaffContext } from '@/hooks/useOrgStaffContext';
import { isSuperAdminUser } from '@/lib/adminAccess';
import { useNotifications } from '@/hooks/useNotifications';
import { getWebsiteAssetUrl } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useMeRoles } from '@/hooks/useMeRoles';
import { useMyTeamsSummary, useMyTeamInvitesSummary } from '@/hooks/useNavTeamStatus';
import { deriveHasApprovedLicense, deriveHasOrganization } from '@/lib/meRoles';
import { getStoredSessionRole } from '@/lib/sessionRole';
import { RoleSwitcherDialog } from '@/components/RoleSwitcher';
import { JackButton } from '@/components/ui/JackButton';

// ─── Brand constants ──────────────────────────────────────────────────────────

const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C%2Ffilter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C%2Fsvg%3E")`;

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem { label: string; to: string }
interface NavSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Direct link for single-item sections (Rankings). No sub-items rendered. */
  to?: string;
  items: NavItem[];
}

const GAMES = [
  { id: 'valorant' as const, label: 'Valorant', logo: '/games/valorant-logo.png' },
  { id: 'cs2' as const, label: 'CS2', logo: '/games/cs2-logo.png' },
];
type GameId = 'valorant' | 'cs2';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isItemActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(to + '/');
}

function isSectionActive(section: NavSection, pathname: string): boolean {
  if (section.to) return isItemActive(pathname, section.to);
  return section.items.some(item => isItemActive(pathname, item.to));
}

function buildSections(canManageTournaments: boolean, canManageVenues: boolean): NavSection[] {
  const tournamentItems: NavItem[] = [
    { label: 'Browse', to: '/tournaments' },
    { label: 'My Registrations', to: '/tournaments' },
  ];
  if (canManageTournaments) {
    tournamentItems.push(
      { label: 'Manage', to: '/organizer/tournaments' },
      { label: 'Create', to: '/tournaments/create' },
    );
  }
  const venueItems: NavItem[] = [{ label: 'Find Venues', to: '/venues/search' }];
  if (canManageVenues) venueItems.push({ label: 'My Venue', to: '/venues/manage' });

  return [
    {
      id: 'find-teammates', label: 'Find Teammates', icon: Users,
      items: [
        { label: 'Discover Players', to: '/competitive/discover' },
        { label: 'My Profile', to: '/competitive/profile/edit' },
        { label: 'Looking for Team', to: '/competitive/lfg/new' },
      ],
    },
    {
      id: 'scrims', label: 'Scrims', icon: Crosshair,
      items: [
        { label: 'Find Scrims', to: '/competitive/scrims' },
        { label: 'My Scrim History', to: '/competitive/scrims' },
      ],
    },
    {
      id: 'tryouts', label: 'Tryouts', icon: ClipboardList,
      items: [
        { label: 'Open Tryouts', to: '/competitive/tryouts/workspace' },
        { label: 'My Applications', to: '/competitive/recruitment/my-applications' },
      ],
    },
    { id: 'tournaments', label: 'Tournaments', icon: Trophy, items: tournamentItems },
    { id: 'venues', label: 'Venues', icon: MapPin, items: venueItems },
    { id: 'rankings', label: 'Rankings', icon: BarChart2, to: '/leaderboards', items: [] },
  ];
}

// ─── Game Selector ────────────────────────────────────────────────────────────

function GameSelector({ collapsed }: { collapsed: boolean }) {
  const [gameId, setGameId] = useState<GameId>(() => {
    const s = localStorage.getItem('sidebar_game');
    return s === 'cs2' ? 'cs2' : 'valorant';
  });
  const [open, setOpen] = useState(false);
  const selected = GAMES.find(g => g.id === gameId) ?? GAMES[0];

  function cycleGame() {
    const idx = GAMES.findIndex(g => g.id === gameId);
    const next = GAMES[(idx + 1) % GAMES.length];
    setGameId(next.id);
    localStorage.setItem('sidebar_game', next.id);
  }

  if (collapsed) {
    return (
      <div className="flex justify-center px-2 pb-2">
        <button
          type="button"
          onClick={cycleGame}
          className="flex items-center justify-center p-1.5 hover:opacity-80 transition-opacity"
          aria-label={`Active game: ${selected.label}. Click to switch`}
        >
          <img src={selected.logo} alt={selected.label} className="h-4 w-4 object-contain" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative px-3 pb-2">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex w-full items-center justify-between px-3 py-2 border border-white/10 text-white/70 hover:text-white/90 transition-colors text-[11px] uppercase tracking-widest [font-family:var(--font-heading)] font-bold"
      >
        <span className="flex items-center gap-2">
          <img src={selected.logo} alt={selected.label} className="h-4 w-4 object-contain" />
          {selected.label}
        </span>
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-3 right-3 z-50 border border-white/10 bg-[#0a0a0c]">
          {GAMES.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => { setGameId(g.id); localStorage.setItem('sidebar_game', g.id); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-widest [font-family:var(--font-heading)] font-bold text-white/50 hover:text-white/90 hover:bg-white/[0.04] transition-colors"
            >
              <img src={g.logo} alt={g.label} className="h-4 w-4 object-contain" />
              {g.label}
              {g.id === gameId && <Check className="ml-auto h-3 w-3 text-rose-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function SidebarSection({ section, collapsed }: { section: NavSection; collapsed: boolean }) {
  const { pathname } = useLocation();
  const active = isSectionActive(section, pathname);
  const Icon = section.icon;

  if (collapsed) {
    const primaryTo = section.to ?? section.items[0]?.to ?? '/';
    return (
      <Link
        to={primaryTo}
        aria-label={section.label}
        className={cn(
          'relative flex w-full justify-center py-3 transition-colors',
          active ? 'text-rose-400' : 'text-white/30 hover:text-white/60',
        )}
      >
        <Icon className="h-5 w-5" />
        {active && (
          <span className="absolute bottom-0 left-[20%] right-[20%] h-0.5 bg-rose-500" aria-hidden="true" />
        )}
      </Link>
    );
  }

  if (section.to) {
    return (
      <Link
        to={section.to}
        className={cn(
          'flex items-center gap-2 px-4 py-3 transition-colors',
          'text-[9px] uppercase tracking-widest font-bold [font-family:var(--font-heading)]',
          active ? 'text-white/60' : 'text-white/25 hover:text-white/50',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{section.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-4 pt-4 pb-1.5">
        <Icon className="h-3.5 w-3.5 text-white/25" />
        <span className="text-[9px] uppercase tracking-widest font-bold text-white/25 [font-family:var(--font-heading)]">
          {section.label}
        </span>
      </div>
      {section.items.map(item => {
        const itemActive = isItemActive(pathname, item.to);
        return (
          <Link
            key={`${section.id}-${item.label}`}
            to={item.to}
            className={cn(
              'block w-full px-5 py-2 transition-colors border-l-2',
              'text-[11px] uppercase tracking-widest font-bold [font-family:var(--font-heading)]',
              itemActive
                ? 'border-rose-500 text-rose-400 bg-rose-500/[0.08]'
                : 'border-transparent text-white/50 hover:text-white/90 hover:bg-white/[0.04] hover:border-white/20',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

// ─── User section ─────────────────────────────────────────────────────────────

/**
 * Full-featured user menu anchored at the sidebar bottom.
 * Expanded: upward panel with identity header, role switcher, all contextual links and sign out.
 * Collapsed: square avatar link to /user/profile.
 * Self-contained — fetches its own data; no props needed except collapsed.
 */
function SidebarUserSection({ collapsed }: { collapsed: boolean }) {
  const { user, profile, isEmailVerified, signOut } = useAuth();
  const { currentRole: userRole } = useRole();
  const admin = useAdmin();
  const { data: meRoles, isSuccess: meRolesReady } = useMeRoles(!!user?.id);
  const { data: teams = [] } = useMyTeamsSummary();
  const { data: teamInvites = [] } = useMyTeamInvitesSummary();
  const { invites: staffInvites, assignments: staffAssignments } = useOrgStaffContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);

  const sessionRoleHint = user?.id ? getStoredSessionRole(user.id) : null;
  const hasApprovedLicense = deriveHasApprovedLicense(meRoles)
    || (!meRolesReady && (sessionRoleHint === 'organizer' || sessionRoleHint === 'venue_owner'));
  const hasOrganization = userRole === 'organizer' && deriveHasOrganization(meRoles);
  const hasTeam = teams.length > 0;
  const hasPendingInvite = teamInvites.length > 0;
  const hasStaffInvites = staffInvites.length > 0;
  const hasStaffAssignments = staffAssignments.length > 0;

  const roleLabel = admin.isAdmin
    ? admin.roles.includes('super_admin')
      ? 'Super Admin'
      : admin.roles.length > 0
        ? admin.roles.map(r => r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')
        : 'Admin'
    : userRole.charAt(0).toUpperCase() + userRole.slice(1);

  const avatarUrl = profile?.avatar_url?.trim() ?? '';
  const showAvatar = !!(avatarUrl && !avatarFailed);
  const initials = (profile?.username ?? profile?.full_name ?? 'U').slice(0, 2).toUpperCase();

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/auth/signin');
    } catch {
      toast({ title: 'Error signing out', description: 'Please try again later', variant: 'destructive' });
    }
  }

  const dot = (color: 'rose' | 'cyan' | 'amber' | 'emerald') => {
    const cls = color === 'rose' ? 'bg-rose-500' : color === 'cyan' ? 'bg-cyan-400'
      : color === 'amber' ? 'bg-amber-400' : 'bg-emerald-400';
    return <span className={`h-2 w-2 rounded-full ${cls} inline-block flex-shrink-0`} />;
  };

  const avatarEl = (size: 'sm' | 'md') => showAvatar ? (
    <img
      src={avatarUrl}
      alt={profile?.username ?? 'Profile'}
      className="h-full w-full object-cover"
      onError={() => setAvatarFailed(true)}
    />
  ) : (
    <span className={cn('font-mono font-bold uppercase tracking-wider text-white', size === 'sm' ? 'text-[9px]' : 'text-[10px]')}>
      {initials}
    </span>
  );

  const menuLink = (to: string, label: string, trailing?: React.ReactNode) => (
    <Link
      key={to + label}
      to={to}
      onClick={() => setOpen(false)}
      className="flex w-full items-center justify-between px-3 py-2 text-[11px] uppercase tracking-widest [font-family:var(--font-heading)] font-bold text-white/50 hover:text-white/90 hover:bg-white/[0.04] transition-colors"
    >
      <span>{label}</span>
      {trailing}
    </Link>
  );

  const divider = () => <div className="my-1 h-px bg-white/[0.06] mx-2" />;

  if (collapsed) {
    return (
      <Link
        to="/user/profile"
        aria-label="My profile"
        className="flex h-8 w-8 mx-auto items-center justify-center overflow-hidden border border-white/10 bg-[#0a0a0c] hover:border-white/30 transition-colors"
      >
        {avatarEl('md')}
      </Link>
    );
  }

  return (
    <>
      <div className="relative w-full">
        {open && (
          <div className="absolute bottom-full left-0 right-0 z-50 border border-white/10 bg-[#0a0a0c] max-h-[70dvh] overflow-y-auto">
            {/* Identity header */}
            <div className="border-b border-white/10 px-3 py-3">
              <p className="text-sm font-semibold text-white leading-tight">
                {profile?.full_name || profile?.username || 'User'}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                  {roleLabel}
                </p>
                {!isEmailVerified && user && (
                  <span className="border border-amber-500/40 px-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-400">
                    Unverified
                  </span>
                )}
              </div>
            </div>

            {/* Role switcher */}
            {!admin.isAdmin && hasApprovedLicense && (
              <div className="border-b border-white/10 p-2">
                <div className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div className="flex flex-col">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Active role</span>
                    <span className="mt-0.5 text-sm font-semibold text-white">{roleLabel}</span>
                  </div>
                  <JackButton size="sm" className="px-3" onClick={() => { setOpen(false); setIsRoleSwitcherOpen(true); }}>
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Switch
                  </JackButton>
                </div>
              </div>
            )}

            {/* Links */}
            <div className="p-1">
              {menuLink('/user/profile', 'My Profile')}
              {menuLink('/account/settings', 'Account Settings')}
              {!admin.isAdmin && menuLink('/verification', 'Apply for License')}
              {hasTeam
                ? menuLink('/player/teams', 'My Team')
                : menuLink('/player/teams', 'Create Your Team', hasPendingInvite ? dot('rose') : undefined)}
              {hasStaffInvites && menuLink('/user/staff-invites', 'Staff Invites', dot('cyan'))}
              {hasStaffAssignments && menuLink('/staff/dashboard', 'Staff Console', dot('emerald'))}
              {menuLink('/user/raise-dispute', 'Raise a Dispute')}
              {menuLink('/user/my-disputes', 'My Disputes')}
              {menuLink('/user/my-bans', 'My Bans')}

              {admin.isAdmin && (
                <>{divider()}
                  {menuLink('/admin/dashboard', 'Admin Dashboard')}
                  {admin.hasPermission('tournaments:create') && <>{menuLink('/organizer/tournaments', 'Manage Tournaments')}{menuLink('/tournaments/create', 'Create Tournament')}</>}
                  {admin.hasPermission('venues:view') && <>{menuLink('/venues/dashboard', 'Venue Dashboard')}{menuLink('/venues/list-venue', 'List New Venue')}</>}
                </>
              )}
              {!admin.isAdmin && userRole === 'venue_owner' && (
                <>{divider()}{menuLink('/venues/dashboard', 'Venue Dashboard')}{menuLink('/venues/list-venue', 'List New Venue')}</>
              )}
              {!admin.isAdmin && userRole === 'organizer' && (
                <>{divider()}
                  {hasOrganization
                    ? <>{menuLink('/organizer/tournaments', 'Manage Tournaments')}{menuLink('/organizer/dashboard?tab=organization', 'Manage Organization')}{menuLink('/tournaments/create', 'Create Tournament')}</>
                    : menuLink('/organizer/setup-organization', 'Setup Organization', dot('amber'))}
                </>
              )}
              {!admin.isAdmin && userRole !== 'organizer' && (
                <>{divider()}{menuLink('/organizer/setup-organization', 'Setup Organization', dot('amber'))}</>
              )}
            </div>

            {/* Sign out */}
            <div className="border-t border-white/10 p-2">
              <button
                type="button"
                onClick={() => { setOpen(false); void handleSignOut(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-widest [font-family:var(--font-heading)] font-bold text-white/50 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(p => !p)}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="User menu"
          className="flex w-full items-center gap-2 px-2 py-1.5 text-white/70 hover:text-white/90 transition-colors"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-[#0a0a0c]">
            {avatarEl('sm')}
          </span>
          <span className="flex-1 min-w-0 truncate text-left text-[11px] font-bold uppercase tracking-widest [font-family:var(--font-heading)]">
            {profile?.username ?? 'Account'}
          </span>
          <ChevronDown className={cn('h-3 w-3 shrink-0 opacity-50 transition-transform duration-150', open && 'rotate-180')} />
        </button>
      </div>

      <RoleSwitcherDialog open={isRoleSwitcherOpen} onOpenChange={setIsRoleSwitcherOpen} />
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Persistent left sidebar (nav_v2). 240 px expanded / 52 px collapsed.
 * top-0 h-[100dvh] — fills the full viewport; topbar is suppressed when nav_v2 is on.
 * Desktop only — AppBottomNav handles mobile.
 * No max-w-* or mx-auto (layout-viewport rule).
 */
export function ProductSidebar() {
  const { user, profile } = useAuth();
  const { currentRole } = useRole();
  const admin = useAdmin();
  const { assignments: staffAssignments } = useOrgStaffContext();
  const { unreadCount } = useNotifications();
  const isSuperAdmin = isSuperAdminUser(admin, profile);
  const canManageVenues =
    currentRole === 'venue_owner' || isSuperAdmin || admin.hasPermission('venues:view');
  const canManageTournaments =
    currentRole === 'organizer' || isSuperAdmin || admin.hasPermission('tournaments:create') || staffAssignments.length > 0;

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');

  function toggle() {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }

  if (!user) return null;

  const sections = buildSections(canManageTournaments, canManageVenues);

  return (
    <motion.aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 sticky top-0 self-start h-[100dvh] transition-all duration-200',
        collapsed ? 'w-[52px]' : 'w-[240px]',
      )}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#08080a',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Animated gradient ambience ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(244,63,94,0.07) 0%, transparent 70%)',
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(168,85,247,0.05) 0%, transparent 70%)',
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, repeatType: 'mirror' as const, ease: 'easeInOut' }}
      />
      {/* ── Noise texture overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: NOISE_BG, backgroundSize: '128px 128px' }}
      />

      {/* ── Content (renders above the absolute layers) ── */}
      <div className="relative flex flex-col h-full">

        {/* Logo */}
        <div className={cn(
          'shrink-0 flex items-center',
          collapsed ? 'justify-center px-2 pt-4 pb-2' : 'px-4 pt-4 pb-2',
        )}>
          <Link to="/" aria-label="Esportra home">
            <img
              src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
              alt="Esportra"
              className={cn('object-contain', collapsed ? 'h-7 w-7' : 'h-6 w-auto')}
            />
          </Link>
        </div>

        {/* Game selector */}
        <GameSelector collapsed={collapsed} />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Site navigation">
          {sections.map((section, i) => (
            <div key={section.id}>
              {i > 0 && !collapsed && (
                <div className="mx-3 my-1 h-px bg-white/[0.06]" aria-hidden="true" />
              )}
              <SidebarSection section={section} collapsed={collapsed} />
            </div>
          ))}
        </nav>

        {/* Bottom bar: bell + user + collapse toggle */}
        <div className="shrink-0">
          <div className="mx-3 h-px bg-white/[0.06]" aria-hidden="true" />
          <div className={cn(
            'flex items-center p-2',
            collapsed ? 'flex-col gap-2' : 'gap-1',
          )}>
            {/* Notification bell */}
            <button
              type="button"
              aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
              className="relative flex items-center justify-center p-2 text-white/40 hover:text-white/80 transition-colors shrink-0"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center bg-rose-500 text-[9px] font-bold text-white leading-none"
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User section */}
            {collapsed ? (
              <SidebarUserSection collapsed />
            ) : (
              <div className="flex-1 min-w-0">
                <SidebarUserSection collapsed={false} />
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <div className="border-t border-white/[0.06] p-2">
            <button
              type="button"
              onClick={toggle}
              className="flex w-full items-center justify-center p-2 text-white/30 hover:text-white/70 transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
            </button>
          </div>
        </div>

      </div>
    </motion.aside>
  );
}
