/**
 * ScrimVetoSection — PROJ-078 Surface 2 (CL-007-S2)
 *
 * Direction: Broadcast (lead), L0.
 * Hero: the public veto room rendered inline (same component as the public tool), no iframe.
 * States: S2-0 (non-eligible), S2-1 (not checked in), S2-2 (transitional 5s),
 *         S2-3 (veto active), S2-4 (veto complete, deferred), S2-5 (unavailable).
 */

import { SCRIM_LABEL } from './scrimCardStyles';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { InlineNotice } from '@/components/ui/kit';
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
        <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0c0f]">
          <Suspense fallback={<PublicMapVetoLoading embedded />}>
            <PublicMapVetoRoom token={vetoMyToken} embedded />
          </Suspense>
        </div>
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
