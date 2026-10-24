import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, Crosshair, ClipboardList, Trophy, MapPin, BarChart2,
  ChevronLeft, ChevronDown, Check, User,
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

// Official game logos — nominative trademark use (CIO CLEARED_WITH_CONDITIONS, PROJ-073)
function ValorantIcon({ className }: { className?: string }) {
  return <img src="/games/valorant-logo.png" alt="Valorant" className={className} style={{ objectFit: 'contain' }} />;
}

function CS2Icon({ className }: { className?: string }) {
  return <img src="/games/cs2-logo.png" alt="CS2" className={className} style={{ objectFit: 'contain' }} />;
}

const GAMES = [
  { id: 'valorant' as const, label: 'Valorant', Icon: ValorantIcon },
  { id: 'cs2' as const, label: 'CS2', Icon: CS2Icon },
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
          <selected.Icon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative px-3 pb-2">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex w-full items-center justify-between px-3 py-2 border border-white/10 hover:border-rose-500/40 text-white/70 hover:text-white transition-colors text-[11px] uppercase tracking-widest [font-family:var(--font-heading)] font-medium"
      >
        <span className="flex items-center gap-2">
          <selected.Icon className="h-4 w-4" />
          {selected.label}
        </span>
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-3 right-3 z-50 border border-white/10 bg-[#08080a]">
          {GAMES.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => { setGameId(g.id); localStorage.setItem('sidebar_game', g.id); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-[11px] uppercase tracking-widest [font-family:var(--font-heading)] font-medium text-white/60 hover:bg-rose-500 hover:text-white transition-colors"
            >
              <g.Icon className="h-4 w-4" />
              {g.label}
              {g.id === gameId && <Check className="ml-auto h-3 w-3" />}
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
          active ? 'text-rose-400' : 'text-white/50 hover:text-white/80',
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
      <div className="flex items-center gap-2 px-4 pt-4 pb-1.5">
        <Icon className="h-5 w-5 text-white/80" />
        <span className="text-[11px] uppercase tracking-widest font-medium text-white/80 [font-family:var(--font-heading)]">
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

  if (!user) return null;

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

        {/* Game selector */}
        <GameSelector collapsed={isCollapsed} />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Site navigation">
          {sections.map((section, i) => (
            <div key={section.id}>
              {i > 0 && !isCollapsed && (
                <div className="mx-3 my-1 h-px bg-white/[0.08]" aria-hidden="true" />
              )}
              <SidebarSection section={section} collapsed={isCollapsed} />
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
                <UserMenu handleSignOut={handleSignOut} upward panelAlign="start" panelWidth={232} />
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
