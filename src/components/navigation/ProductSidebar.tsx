import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, Crosshair, Trophy, MapPin, BarChart2, MessageSquare,
  ChevronLeft, ChevronDown, User, Wrench, DollarSign, Info,
} from 'lucide-react';
import { motion } from 'framer-motion';
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
      items: [
        { label: 'Looking for Team', to: '/competitive/looking-for-team' },
        { label: 'Looking for Player', to: '/competitive/looking-for-player' },
      ],
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

  if (collapsed) {
    const hasSubItems = section.items.length > 0;
    const primaryTo = section.to ?? section.items[0]?.to ?? '/';
    const baseClass = cn(
      'relative flex w-full justify-center py-3 transition-colors',
      active ? 'text-rose-400' : 'text-white/50 hover:text-white/80',
    );
    const indicator = active && (
      <span className="absolute bottom-0 left-[20%] right-[20%] h-0.5 bg-rose-500" aria-hidden="true" />
    );
    if (hasSubItems) {
      return (
        <button
          type="button"
          aria-label={section.label}
          onClick={() => onExpand?.()}
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
        className={cn(
          'flex items-center gap-2 px-4 py-3 transition-colors',
          'text-[11px] uppercase tracking-widest font-medium [font-family:var(--font-heading)]',
          active ? 'text-white/80' : 'text-white/70 hover:text-white',
        )}
      >
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
        className={cn(
          'flex w-full items-center gap-2 px-4 pt-4 pb-1.5 transition-colors',
          active ? 'text-white/90' : 'text-white/60 hover:text-white/80',
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left text-[11px] uppercase tracking-widest font-medium [font-family:var(--font-heading)]">
          {section.label}
        </span>
        <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && section.items.map(item => {
        const itemActive = isItemActive(pathname, item.to);
        return (
          <Link
            key={`${section.id}-${item.label}`}
            to={item.to}
            className={cn(
              'block w-full px-5 py-2 transition-colors border-l-2',
              'text-[11px] uppercase tracking-widest font-medium [font-family:var(--font-heading)]',
              itemActive
                ? 'border-rose-500 text-rose-400 bg-rose-500/[0.10]'
                : 'border-transparent text-white/70 hover:text-white hover:bg-rose-500/[0.08] hover:border-rose-500/50',
            )}
          >
            {item.label}
          </Link>
        );
      })}
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
    <motion.aside
      className="hidden lg:flex flex-col shrink-0 sticky top-0 self-start h-[100dvh] w-[240px]"
      style={{ backgroundColor: '#08080a', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            'radial-gradient(ellipse 100% 35% at 50% 0%, rgba(244,63,94,0.22) 0%, transparent 65%)',
            'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(168,85,247,0.14) 0%, transparent 65%)',
          ],
        }}
        transition={{ duration: 5, repeat: Infinity, repeatType: 'mirror' as const, ease: 'easeInOut' }}
      />
      <div className="relative flex flex-col h-full">
        <div className="shrink-0 px-4 pt-4 pb-2">
          <Link to="/" aria-label="Esportra home">
            <img
              src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
              alt="Esportra"
              className="h-6 w-auto object-contain"
            />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-2" aria-label="Site navigation">
          {PUBLIC_LINKS.map((link) => {
            const active = pathname === link.to || pathname.startsWith(link.to + '/');
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 transition-colors',
                  'text-[11px] uppercase tracking-widest font-medium [font-family:var(--font-heading)]',
                  active ? 'text-white/90' : 'text-white/60 hover:text-white/80',
                )}
              >
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
    </motion.aside>
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
    <motion.aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 sticky top-0 self-start h-[100dvh] transition-all duration-200',
        isCollapsed ? 'w-[52px]' : 'w-[240px]',
      )}
      style={{
        backgroundColor: '#08080a',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Animated gradient ambience ── */}
      {/* Top rose glow — pulses between rose and violet */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            'radial-gradient(ellipse 100% 35% at 50% 0%, rgba(244,63,94,0.22) 0%, transparent 65%)',
            'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(168,85,247,0.14) 0%, transparent 65%)',
          ],
        }}
        transition={{ duration: 5, repeat: Infinity, repeatType: 'mirror' as const, ease: 'easeInOut' }}
      />
      {/* Bottom rose bleed */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(244,63,94,0.12) 0%, transparent 70%)' }}
      />
      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{ backgroundImage: NOISE_BG, backgroundSize: '128px 128px' }}
      />

      {/* ── Content (renders above the absolute layers) ── */}
      <div className="relative flex flex-col h-full">

        {/* Logo */}
        <div className={cn(
          'shrink-0 flex items-center',
          isCollapsed ? 'justify-center px-2 pt-4 pb-2' : 'px-4 pt-4 pb-2',
        )}>
          <Link to="/" aria-label="Esportra home">
            <img
              src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
              alt="Esportra"
              className={cn('object-contain', isCollapsed ? 'h-7 w-7' : 'h-6 w-auto')}
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Site navigation">
          {sections.map((section, i) => (
            <div key={section.id}>
              {i > 0 && !isCollapsed && (
                <div className="mx-3 my-1 h-px bg-white/[0.08]" aria-hidden="true" />
              )}
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
              className="flex w-full items-center justify-center p-2 text-white/30 hover:text-white/70 transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform duration-200', isCollapsed && 'rotate-180')} />
            </button>
          </div>
        </div>

      </div>
    </motion.aside>
  );
}
