import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, Crosshair, Trophy, MapPin, BarChart2, MessageSquare,
  ChevronLeft, ChevronDown, User, Wrench, DollarSign, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useAdmin } from '@/hooks/useAdmin';
import { useOrgStaffContext } from '@/hooks/useOrgStaffContext';
import { isSuperAdminUser } from '@/lib/adminAccess';
import { getWebsiteAssetUrl } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { JackButton } from '@/components/ui/JackButton';
import UserMenu from './UserMenu';
import { NotificationSidebar } from '../notifications/NotificationSidebar';
import './product-sidebar.css';

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
      id: 'inbox', label: 'Inbox', icon: MessageSquare,
      to: '/inbox',
      items: [],
    },
    {
      id: 'find-teammates', label: 'Find Teammates', icon: Users,
      to: '/competitive/lfg',
      items: [],
    },
    {
      id: 'scrims', label: 'Scrims', icon: Crosshair,
      items: [
        { label: 'Find Scrims', to: '/competitive/scrims' },
        { label: 'My Scrim History', to: '/competitive/scrims' },
      ],
    },
    { id: 'tournaments', label: 'Tournaments', icon: Trophy, items: tournamentItems },
    { id: 'venues', label: 'Venues', icon: MapPin, items: venueItems },
    { id: 'rankings', label: 'Rankings', icon: BarChart2, to: '/leaderboards', items: [] },
    { id: 'tools', label: 'Tools', icon: Wrench, to: '/tools/map-veto', items: [] },
    { id: 'pricing', label: 'Pricing', icon: DollarSign, to: '/pricing', items: [] },
    { id: 'about', label: 'About', icon: Info, to: '/about/company', items: [] },
  ];
}

// ─── Section ──────────────────────────────────────────────────────────────────

function SidebarSection({ section, collapsed, onExpand }: { section: NavSection; collapsed: boolean; onExpand?: () => void }) {
  const { pathname } = useLocation();
  const active = isSectionActive(section, pathname);
  const Icon = section.icon;
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  if (collapsed) {
    const hasSubItems = section.items.length > 0;
    const primaryTo = section.to ?? section.items[0]?.to ?? '/';
    const baseClass = cn(
      'product-sidebar-item product-sidebar-item-collapsed',
      active && 'is-active',
    );
    const indicator = active && (
      <span className="product-sidebar-indicator" aria-hidden="true" />
    );
    if (hasSubItems) {
      return (
        <button
          type="button"
          aria-label={section.label}
          title={section.label}
          onClick={() => { setOpen(true); onExpand?.(); }}
          className={baseClass}
        >
          <Icon className="h-5 w-5" />
          {indicator}
        </button>
      );
    }
    return (
      <Link
        to={primaryTo}
        aria-label={section.label}
        aria-current={active ? 'page' : undefined}
        title={section.label}
        className={baseClass}
      >
        <Icon className="h-5 w-5" />
        {indicator}
      </Link>
    );
  }

  if (section.to) {
    return (
      <Link
        to={section.to}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'product-sidebar-item',
          active && 'is-active',
        )}
      >
        {active && <span className="product-sidebar-indicator" aria-hidden="true" />}
        <Icon className="h-5 w-5" />
        <span>{section.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        aria-expanded={open}
        aria-controls={`sidebar-${section.id}`}
        className={cn(
          'product-sidebar-item product-sidebar-section',
          active && 'is-active',
        )}
      >
        {active && <span className="product-sidebar-indicator" aria-hidden="true" />}
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">
          {section.label}
        </span>
        <ChevronDown className={cn('product-sidebar-chevron h-3.5 w-3.5 shrink-0', open && 'rotate-180')} />
      </button>
      <div id={`sidebar-${section.id}`} className="product-sidebar-subnav" hidden={!open}>{section.items.map(item => {
        const itemActive = isItemActive(pathname, item.to);
        return (
          <Link
            key={`${section.id}-${item.label}`}
            to={item.to}
            aria-current={itemActive ? 'page' : undefined}
            className={cn(
              'product-sidebar-subitem',
              itemActive && 'is-active',
            )}
          >
            {item.label}
          </Link>
        );
      })}</div>
    </div>
  );
}

// ─── Collapsed avatar ─────────────────────────────────────────────────────────

function CollapsedAvatar() {
  const { profile } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUrl = profile?.avatar_url?.trim() ?? '';
  const showAvatar = !!(avatarUrl && !avatarFailed);
  const initials = (profile?.username ?? profile?.full_name ?? 'U').slice(0, 2).toUpperCase();
  return (
    <Link
      to="/user/profile"
      aria-label="My profile"
      className="flex h-8 w-8 mx-auto items-center justify-center overflow-hidden border border-white/10 bg-[#0a0a0c] hover:border-rose-500/50 transition-colors"
    >
      {showAvatar ? (
        <img src={avatarUrl} alt={profile?.username ?? 'Profile'} className="h-full w-full object-cover" onError={() => setAvatarFailed(true)} />
      ) : profile?.username ? (
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-white">{initials}</span>
      ) : (
        <User className="h-4 w-4 text-white/50" />
      )}
    </Link>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// ─── Logged-out sidebar ───────────────────────────────────────────────────────

const PUBLIC_LINKS = [
  { label: 'Tournaments', to: '/tournaments', icon: Trophy },
  { label: 'Venues', to: '/venues/search', icon: MapPin },
  { label: 'Rankings', to: '/leaderboards', icon: BarChart2 },
  { label: 'Tools', to: '/tools/map-veto', icon: Wrench },
  { label: 'Pricing', to: '/pricing', icon: DollarSign },
  { label: 'About', to: '/about/company', icon: Info },
];

function LoggedOutSidebar() {
  const { pathname } = useLocation();
  return (
    <aside
      className="product-sidebar hidden lg:flex flex-col shrink-0 sticky top-0 self-start h-[100dvh] w-[240px]"
      style={{ backgroundColor: '#08080a', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="product-sidebar-ambience" aria-hidden="true" />
      <div className="relative flex flex-col h-full">
        <div className="product-sidebar-brand-wrap">
          <Link to="/" aria-label="Esportra home" className="product-sidebar-brand">
            <img
              src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
              alt="Esportra"
              className="h-6 w-auto object-contain"
            />
            <span><strong>ESPORTRA</strong><small>COMPETITIVE PLATFORM</small></span>
          </Link>
        </div>

        <nav className="product-sidebar-nav flex-1 overflow-y-auto py-2" aria-label="Site navigation">
          {PUBLIC_LINKS.map((link) => {
            const active = pathname === link.to || pathname.startsWith(link.to + '/');
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'product-sidebar-item',
                  active && 'is-active',
                )}
              >
                {active && <span className="product-sidebar-indicator" aria-hidden="true" />}
                <Icon className="h-5 w-5 shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 p-3 space-y-2">
          <div className="h-px bg-white/[0.08] mb-3" />
          <JackButton as={Link} to="/auth/signup" size="sm" className="w-full justify-center">
            Sign up
          </JackButton>
          <Link
            to="/auth/signin"
            className="flex w-full items-center justify-center px-3 py-2 text-[13px] font-medium text-white/70 hover:text-white transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    </aside>
  );
}

/**
 * Persistent left sidebar (nav_v2). 240 px expanded / 52 px collapsed.
 * top-0 h-[100dvh] — fills the full viewport; topbar is suppressed when nav_v2 is on.
 * Desktop only — AppBottomNav handles mobile.
 * No max-w-* or mx-auto (layout-viewport rule).
 */
export function ProductSidebar() {
  const { user, profile, signOut } = useAuth();
  const { currentRole } = useRole();
  const admin = useAdmin();
  const { assignments: staffAssignments } = useOrgStaffContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isSuperAdmin = isSuperAdminUser(admin, profile);
  const canManageVenues =
    currentRole === 'venue_owner' || isSuperAdmin || admin.hasPermission('venues:view');
  const canManageTournaments =
    currentRole === 'organizer' || isSuperAdmin || admin.hasPermission('tournaments:create') || staffAssignments.length > 0;

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const { pathname } = useLocation();
  const isTournamentDashboard = pathname.startsWith('/organizer/tournaments/');
  const isCompetitivePage = pathname.startsWith('/competitive/');
  const wasCompetitivePage = useRef(isCompetitivePage);

  // Auto-collapse when navigating INTO competitive pages; allow manual toggle after.
  useEffect(() => {
    if (isCompetitivePage && !wasCompetitivePage.current) {
      setCollapsed(true);
      localStorage.setItem('sidebar_collapsed', 'true');
    }
    wasCompetitivePage.current = isCompetitivePage;
  }, [isCompetitivePage]);

  const isCollapsed = collapsed || isTournamentDashboard;

  function toggle() {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/auth/signin');
    } catch {
      toast({ title: 'Error signing out', description: 'Please try again later', variant: 'destructive' });
    }
  }

  if (!user) return <LoggedOutSidebar />;

  const sections = buildSections(canManageTournaments, canManageVenues);

  return (
    <aside
      className={cn(
        'product-sidebar hidden lg:flex flex-col shrink-0 sticky top-0 self-start h-[100dvh]',
        isCollapsed ? 'w-[52px]' : 'w-[240px]',
      )}
      style={{
        backgroundColor: '#08080a',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="product-sidebar-ambience" aria-hidden="true" />

      {/* ── Content (renders above the absolute layers) ── */}
      <div className="relative flex flex-col h-full">

        {/* Logo */}
        <div className={cn('product-sidebar-brand-wrap', isCollapsed && 'is-collapsed')}>
          <Link to="/" aria-label="Esportra home" className="product-sidebar-brand">
            <img
              src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
              alt="Esportra"
              className={cn('object-contain', isCollapsed ? 'h-7 w-7' : 'h-6 w-auto')}
            />
            {!isCollapsed && <span><strong>ESPORTRA</strong><small>COMPETITIVE PLATFORM</small></span>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="product-sidebar-nav flex-1 overflow-y-auto py-2" aria-label="Site navigation">
          {sections.map((section, i) => (
            <div key={section.id}>
              {(i === 3 || i === 6) && <div className="product-sidebar-group-rule" aria-hidden="true" />}
              <SidebarSection section={section} collapsed={isCollapsed} onExpand={toggle} />
            </div>
          ))}
        </nav>

        {/* Bottom bar: bell + user + collapse toggle */}
        <div className="shrink-0">
          <div className="mx-3 h-px bg-white/[0.08]" aria-hidden="true" />
          <div className={cn(
            'flex items-center p-2',
            isCollapsed ? 'flex-col gap-2' : 'gap-1',
          )}>
            {/* Notification bell */}
            <NotificationSidebar className="relative flex items-center justify-center p-2 text-white/40 hover:text-white/80 transition-colors shrink-0 border-0 bg-transparent h-auto w-auto" />

            {/* User section */}
            {isCollapsed ? (
              <CollapsedAvatar />
            ) : (
              <div className="flex-1 min-w-0 [&>div]:w-full">
                <UserMenu handleSignOut={handleSignOut} upward panelAlign="end" panelWidth={232} />
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <div className="border-t border-white/[0.06] p-2">
            <button
              type="button"
              onClick={toggle}
              className="product-sidebar-toggle"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform duration-200', isCollapsed && 'rotate-180')} />
            </button>
          </div>
        </div>

      </div>
    </aside>
  );
}
