import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Crosshair, Trophy, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Tab definitions ──────────────────────────────────────────────────────────

interface BottomTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  matchPaths: string[];
}

const BOTTOM_TABS: BottomTab[] = [
  {
    id: 'find-teammates',
    label: 'Teammates',
    icon: Users,
    to: '/competitive/looking-for-team',
    matchPaths: ['/competitive/discover', '/competitive/lfg', '/competitive/profile', '/competitive/looking-for-team', '/competitive/looking-for-player'],
  },
  {
    id: 'scrims',
    label: 'Scrims',
    icon: Crosshair,
    to: '/competitive/scrims',
    matchPaths: ['/competitive/scrims'],
  },
  {
    id: 'tournaments',
    label: 'Tournaments',
    icon: Trophy,
    to: '/tournaments',
    matchPaths: ['/tournaments', '/organizer/tournaments'],
  },
  {
    id: 'more',
    label: 'More',
    icon: Menu,
    to: '',
    matchPaths: ['/venues', '/leaderboards'],
  },
];

// ─── Drawer groups ────────────────────────────────────────────────────────────

interface DrawerGroup {
  label: string;
  items: { label: string; to: string }[];
}

const DRAWER_GROUPS: DrawerGroup[] = [
  {
    label: 'Competitive',
    items: [
      { label: 'Discover Players', to: '/competitive/discover' },
      { label: 'My Profile', to: '/competitive/profile/edit' },
      { label: 'Find a Team', to: '/competitive/looking-for-team' },
      { label: 'Find Players', to: '/competitive/looking-for-player' },
    ],
  },
  {
    label: 'Scrims',
    items: [
      { label: 'Find Scrims', to: '/competitive/scrims' },
      { label: 'My Scrim History', to: '/competitive/scrims' },
    ],
  },
  {
    label: 'Tournaments',
    items: [
      { label: 'Browse', to: '/tournaments' },
      { label: 'My Registrations', to: '/tournaments' },
    ],
  },
  {
    label: 'Venues',
    items: [{ label: 'Find Venues', to: '/venues/search' }],
  },
  {
    label: 'Rankings',
    items: [{ label: 'Leaderboards', to: '/leaderboards' }],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isTabActive(tab: BottomTab, pathname: string): boolean {
  return tab.matchPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Mobile sticky bottom nav rail (5 tabs) + full-section drawer for "More".
 * Only renders on lg:hidden breakpoints — ProductSidebar handles desktop.
 */
export function AppBottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleTabPress(tab: BottomTab) {
    if (tab.id === 'more') {
      setDrawerOpen(prev => !prev);
      return;
    }
    setDrawerOpen(false);
    navigate(tab.to);
  }

  return (
    <>
      {/* Full-section drawer (slides up from bottom) */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Scrim */}
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[990] bg-black/60 lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-x-0 bottom-[56px] z-[995] lg:hidden"
              style={{ backgroundColor: '#0a0a0c', borderTop: '1px solid rgba(255,255,255,0.1)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <span className="text-[11px] uppercase tracking-widest font-bold text-white/50 [font-family:var(--font-heading)]">
                  Navigation
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 text-white/40 hover:text-white transition-colors"
                  aria-label="Close navigation drawer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Groups */}
              <div className="max-h-[60dvh] overflow-y-auto overscroll-contain pb-4" data-lenis-prevent>
                {DRAWER_GROUPS.map((group, gi) => (
                  <div key={group.label}>
                    {gi > 0 && <div className="mx-4 my-1 h-px bg-white/[0.06]" />}
                    <div className="px-4 pt-3 pb-1">
                      <p className="mb-1.5 text-[9px] uppercase tracking-widest font-bold text-white/25 [font-family:var(--font-heading)]">
                        {group.label}
                      </p>
                    </div>
                    {group.items.map(item => {
                      const active = pathname === item.to || pathname.startsWith(item.to + '/');
                      return (
                        <Link
                          key={`${group.label}-${item.label}`}
                          to={item.to}
                          onClick={() => setDrawerOpen(false)}
                          className={cn(
                            'block w-full px-5 py-3 text-left transition-colors border-l-2',
                            'text-[11px] uppercase tracking-widest font-bold [font-family:var(--font-heading)]',
                            active
                              ? 'border-rose-500 text-rose-400 bg-rose-500/[0.08]'
                              : 'border-transparent text-white/60 hover:text-white hover:bg-white/[0.04]',
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom rail */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[999] flex lg:hidden h-14"
        style={{ backgroundColor: '#0a0a0c', borderTop: '1px solid rgba(255,255,255,0.08)' }}
        aria-label="Mobile navigation"
      >
        {BOTTOM_TABS.map(tab => {
          const Icon = tab.icon;
          const active = isTabActive(tab, pathname);
          const isMore = tab.id === 'more';
          const moreActive = isMore && drawerOpen;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabPress(tab)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
                active || moreActive ? 'text-rose-400' : 'text-white/35 hover:text-white/70',
              )}
              aria-label={tab.label}
              aria-pressed={isMore ? drawerOpen : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] uppercase tracking-wider font-bold [font-family:var(--font-heading)]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
