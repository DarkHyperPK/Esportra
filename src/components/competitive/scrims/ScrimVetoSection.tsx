/**
 * ScrimVetoSection — PROJ-078 Surface 2 (CL-007-S2)
 *
 * Direction: Broadcast (lead), L0.
 * Hero: a button that opens the public veto room in a dialog (same flow as the tournament match room).
 * States: S2-0 (non-eligible), S2-1 (not checked in), S2-2 (transitional 5s),
 *         S2-3 (veto active), S2-4 (veto complete, deferred), S2-5 (unavailable).
 */

import { SCRIM_LABEL } from './scrimCardStyles';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { InlineNotice } from '@/components/ui/kit';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PublicMapVetoLoading } from '@/pages/tools/PublicMapVetoView';

const PublicMapVetoRoom = lazy(() => import('@/pages/tools/PublicMapVetoRoom'));

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScrimVetoSectionProps {
  vetoSessionId: string | null;
  vetoMyToken: string | null;
  gameSlug: string | null;
  /** session.status — used to detect when both teams are checked in (in_progress) */
  sessionStatus: string;
  /** Re-fetch the session; shown as "Check again" if the veto did not appear. */
  onRetry?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VETO_ENABLED_GAMES = ['valorant', 'cs2'];
const TRANSITIONAL_TIMEOUT_MS = 5_000;

// ── ScrimVetoSection ──────────────────────────────────────────────────────────

export function ScrimVetoSection({ vetoSessionId, vetoMyToken, gameSlug, sessionStatus, onRetry }: ScrimVetoSectionProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const isEligibleGame = VETO_ENABLED_GAMES.includes((gameSlug ?? '').toLowerCase());
  const isInProgress = sessionStatus === 'in_progress';

  // Transitional state: both checked in but vetoSessionId not yet set.
  // After 5s without a vetoSessionId, transition to "unavailable".
  const [transitionalExpired, setTransitionalExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isEligibleGame || !isInProgress || vetoSessionId) {
      setTransitionalExpired(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    // Start 5-second timer
    setTransitionalExpired(false);
    timerRef.current = setTimeout(() => setTransitionalExpired(true), TRANSITIONAL_TIMEOUT_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isEligibleGame, isInProgress, vetoSessionId]);

  const fadeIn = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.18, ease: 'easeOut' } };

  // S2-0: Non-eligible game — render nothing
  if (!isEligibleGame) return null;

  // S2-1: Eligible game but session not yet in_progress (not both checked in) — render nothing
  if (!isInProgress && !vetoSessionId) return null;

  // S2-3: vetoSessionId set, veto tool active
  if (vetoSessionId && vetoMyToken) {
    return (
      <motion.section aria-labelledby="veto-title" {...fadeIn}>
        <p id="veto-title" className={SCRIM_LABEL}>Map veto</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0c0c0f] px-4 py-3">
          <p className="text-[13px] text-zinc-400">Ban and pick maps together, then share the party code.</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-[40px] rounded-lg bg-white px-4 text-[13px] font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Open map veto
          </button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="flex h-[min(92dvh,920px)] w-[min(96vw,1200px)] max-w-none flex-col gap-0 overflow-hidden rounded-xl border-white/[0.1] bg-[#0c0c0f] p-0">
            <DialogHeader className="shrink-0 border-b border-white/[0.08] px-5 py-3.5 text-left">
              <DialogTitle className="text-[15px] font-semibold text-white">Map veto</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-5 sm:px-6" data-lenis-prevent>
              <Suspense fallback={<PublicMapVetoLoading embedded />}>
                <PublicMapVetoRoom token={vetoMyToken} embedded />
              </Suspense>
            </div>
          </DialogContent>
        </Dialog>
      </motion.section>
    );
  }

  // S2-2: Transitional — both checked in, veto not yet created (≤5s)
  if (isInProgress && !vetoSessionId && !transitionalExpired) {
    return (
      <motion.section aria-labelledby="veto-title" {...fadeIn}>
        <p id="veto-title" className={SCRIM_LABEL}>Map veto</p>
        <div className="mt-3">
          <InlineNotice tone="neutral">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
              Setting up map veto…
            </span>
          </InlineNotice>
        </div>
      </motion.section>
    );
  }

  // S2-5: Veto creation failed (5s elapsed, still no vetoSessionId)
  if (isInProgress && !vetoSessionId && transitionalExpired) {
    return (
      <motion.section aria-labelledby="veto-title" {...fadeIn}>
        <p id="veto-title" className={SCRIM_LABEL}>Map veto</p>
        <div className="mt-3">
          <InlineNotice
            tone="neutral"
            action={onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="text-[11px] font-medium text-white/80 underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Check again
              </button>
            ) : undefined}
          >
            Map veto unavailable for this session. Lobby code is available.
          </InlineNotice>
        </div>
      </motion.section>
    );
  }

  return null;
}
