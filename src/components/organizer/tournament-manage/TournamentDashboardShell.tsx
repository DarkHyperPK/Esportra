/**
 * TournamentDashboardShell.tsx
 *
 * Outer layout shell for the tournament dashboard.
 * CommandShell > CommandPageGrid with rail and content column.
 * Mobile drawer for < 768px breakpoint.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CommandShell,
  CommandPageGrid,
  CommandRail,
} from '@/components/management/CommandSurface';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';
import type { CompletionSummary } from '@/hooks/useCompletionState';
import { TournamentDashboardNav } from './TournamentDashboardNav';
import { MobileDrawer } from './MobileDrawer';
import Footer from '@/components/Footer';

interface TournamentDashboardShellProps {
  tournament: DashboardTournament;
  completionSummary: CompletionSummary;
  permissions: {
    canManageTeams: boolean;
    canAssistDisputes: boolean;
    canSendAnnouncements: boolean;
    canEditBracket: boolean;
    canManageStaff: boolean;
    canActAsOwner: boolean;
  };
  isBattleRoyale: boolean;
  children: React.ReactNode;
}

const panelVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15, ease: [0, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12, ease: [0.4, 0, 1, 1] },
  },
};

export function TournamentDashboardShell({
  tournament,
  completionSummary,
  permissions,
  isBattleRoyale,
  children,
}: TournamentDashboardShellProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const activeTab = searchParams.get('tab') || 'overview';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
    setDrawerOpen(false); // Close drawer on mobile after selection
  };

  // Redirect legacy ?tab=settings to ?tab=advanced
  useEffect(() => {
    if (searchParams.get('tab') === 'settings') {
      setSearchParams({ tab: 'advanced' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <CommandShell>
      <CommandPageGrid
        rail={
          <>
            {/* Desktop Rail */}
            <CommandRail className="hidden max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-none md:block lg:sticky lg:top-20">
              <TournamentDashboardNav
                tournament={tournament}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                completionSummary={completionSummary}
                permissions={permissions}
                isBattleRoyale={isBattleRoyale}
              />
            </CommandRail>

            {/* Mobile Drawer */}
            <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
              <TournamentDashboardNav
                tournament={tournament}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                completionSummary={completionSummary}
                permissions={permissions}
                isBattleRoyale={isBattleRoyale}
              />
            </MobileDrawer>
          </>
        }
      >
        {/* Mobile Header Bar */}
        <div className="flex items-center gap-3 border border-white/10 bg-[#0a0a0c]/92 p-3 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center border border-white/10 bg-black"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5 text-white" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{tournament.name}</p>
          </div>
        </div>

        {/* Content Area with Panel Transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={shouldReduceMotion ? {} : panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="min-h-[400px] space-y-6"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </CommandPageGrid>
      <Footer />
    </CommandShell>
  );
}
