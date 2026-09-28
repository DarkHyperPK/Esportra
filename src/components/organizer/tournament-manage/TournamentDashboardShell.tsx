/**
 * TournamentDashboardShell.tsx
 *
 * Outer layout shell for the tournament dashboard.
 * CommandShell > CommandPageGrid with rail and content column.
 * Mobile drawer for < 768px breakpoint.
 * Includes CompletionBanner, PublishButton, dirty-state navigation guard.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  CommandShell,
  CommandPageGrid,
  CommandRail,
  DashboardPanelProvider,
} from '@/components/management/CommandSurface';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';
import type { CompletionSummary } from '@/hooks/useCompletionState';
import { TournamentDashboardNav } from './TournamentDashboardNav';
import { MobileDrawer } from './MobileDrawer';
import { CompletionBanner } from './CompletionBanner';
import { PublishButton } from './PublishButton';
import Footer from '@/components/Footer';

// ── Dirty State Context ────────────────────────────────────────────────────────

interface DirtyStateContextValue {
  /** Register the active panel's dirty state. Call with `true` when form has changes. */
  setDirty: (dirty: boolean) => void;
}

const DirtyStateContext = createContext<DirtyStateContextValue>({ setDirty: () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export function useDirtyState() {
  return useContext(DirtyStateContext);
}

// ── Shell ──────────────────────────────────────────────────────────────────────

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
  const [isDirty, setIsDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const activeTab = searchParams.get('tab') || 'overview';

  // Clear dirty state whenever the active tab changes (panel unmounts/remounts)
  useEffect(() => {
    setIsDirty(false);
  }, [activeTab]);

  const setDirty = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  const commitTabChange = useCallback(
    (tab: string) => {
      setSearchParams({ tab }, { replace: true });
      setDrawerOpen(false);
      setIsDirty(false);
    },
    [setSearchParams]
  );

  const setActiveTab = useCallback(
    (tab: string) => {
      if (isDirty && tab !== activeTab) {
        // Hold the desired tab and show the guard dialog
        setPendingTab(tab);
        return;
      }
      commitTabChange(tab);
    },
    [isDirty, activeTab, commitTabChange]
  );

  // Redirect legacy ?tab=advanced to ?tab=settings
  useEffect(() => {
    if (searchParams.get('tab') === 'advanced') {
      setSearchParams({ tab: 'settings' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <DirtyStateContext.Provider value={{ setDirty }}>
      <CommandShell>
        <CommandPageGrid
          className="gap-3 py-3 pl-0 xl:pl-0"
          rail={
            <>
              {/* Desktop Rail */}
              <CommandRail className="hidden md:block lg:sticky lg:top-20">
                <TournamentDashboardNav
                  tournament={tournament}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  completionSummary={completionSummary}
                  permissions={permissions}
                  isBattleRoyale={isBattleRoyale}
                />
                {/* Publish button lives in the rail — only for draft tournaments */}
                {tournament.status === 'draft' && permissions.canActAsOwner && (
                  <div className="mt-3 border-t border-white/[0.07] pt-3">
                    <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                      DRAFT
                    </p>
                    <PublishButton
                      tournament={tournament}
                      completionSummary={completionSummary}
                      canActAsOwner={permissions.canActAsOwner}
                      onPublished={() => setSearchParams({ tab: activeTab }, { replace: true })}
                    />
                  </div>
                )}
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
            <PublishButton
              tournament={tournament}
              completionSummary={completionSummary}
              canActAsOwner={permissions.canActAsOwner}
              onPublished={() => setSearchParams({ tab: activeTab }, { replace: true })}
            />
          </div>

          {/* Completion Banner */}
          <CompletionBanner
            completionSummary={completionSummary}
            tournamentStatus={tournament.status}
          />

          {/* Content Area with Panel Transition */}
          <DashboardPanelProvider>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={shouldReduceMotion ? undefined : panelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="overflow-hidden border border-white/[0.07] bg-[#0d0e12] pb-16 md:pb-0"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </DashboardPanelProvider>

          {/* Mobile sticky publish bar */}
          {tournament.status === 'draft' && (
            <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-white/10 bg-[#08080a]/95 p-3 backdrop-blur-sm md:hidden">
              <p className="text-xs text-zinc-500">Draft</p>
              <PublishButton
                tournament={tournament}
                completionSummary={completionSummary}
                canActAsOwner={permissions.canActAsOwner}
                onPublished={() => setSearchParams({ tab: activeTab }, { replace: true })}
              />
            </div>
          )}
        </CommandPageGrid>

        {/* Dirty-state navigation guard */}
        <AlertDialog open={pendingTab !== null} onOpenChange={(o) => !o && setPendingTab(null)}>
          <AlertDialogContent className="border-white/10 bg-[#0d0d0f] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                You have unsaved changes on this panel. If you navigate away your changes will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel
                onClick={() => setPendingTab(null)}
                className="border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:text-white"
              >
                Stay
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingTab) {
                    commitTabChange(pendingTab);
                    setPendingTab(null);
                  }
                }}
                className="border border-rose-500/60 bg-rose-500/[0.12] px-4 py-2 text-sm font-bold uppercase tracking-wider text-rose-300 transition-colors hover:border-rose-500 hover:text-white"
              >
                Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Footer />
      </CommandShell>
    </DirtyStateContext.Provider>
  );
}
