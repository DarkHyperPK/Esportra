/**
 * ScrimVetoSection — PROJ-078 Surface 2 (CL-007-S2)
 *
 * Direction: Broadcast (lead), L0.
 * Hero: iframe embed of the existing public veto tool (PROJ-060 decision).
 * UX risk 3 (iOS iframe scroll): scrolling="no" on the iframe element.
 * States: S2-0 (non-eligible), S2-1 (not checked in), S2-2 (transitional 5s),
 *         S2-3 (iframe active), S2-4 (veto complete, deferred), S2-5 (unavailable).
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { InlineNotice, EYEBROW_CLASS } from '@/components/ui/kit';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScrimVetoSectionProps {
  vetoSessionId: string | null;
  vetoMyToken: string | null;
  gameSlug: string | null;
  /** session.status — used to detect when both teams are checked in (in_progress) */
  sessionStatus: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VETO_ENABLED_GAMES = ['valorant', 'cs2'];
const TRANSITIONAL_TIMEOUT_MS = 5_000;

// ── ScrimVetoSection ──────────────────────────────────────────────────────────

export function ScrimVetoSection({ vetoSessionId, vetoMyToken, gameSlug, sessionStatus }: ScrimVetoSectionProps) {
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
    const iframeUrl = `/tools/map-veto/team/${vetoMyToken}`;
    return (
      <motion.section aria-labelledby="veto-title" {...fadeIn}>
        <p id="veto-title" className={EYEBROW_CLASS}>MAP VETO</p>
        <div className="mt-3">
          {/* UX risk 3: scrolling="no" prevents iOS Safari scroll interception */}
          <iframe
            src={iframeUrl}
            title="Map veto"
            scrolling="no"
            className="w-full border-0"
            style={{ height: 'max(420px, 60dvh)' }}
            allow="same-origin"
          />
        </div>
      </motion.section>
    );
  }

  // S2-2: Transitional — both checked in, veto not yet created (≤5s)
  if (isInProgress && !vetoSessionId && !transitionalExpired) {
    return (
      <motion.section aria-labelledby="veto-title" {...fadeIn}>
        <p id="veto-title" className={EYEBROW_CLASS}>MAP VETO</p>
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
        <p id="veto-title" className={EYEBROW_CLASS}>MAP VETO</p>
        <div className="mt-3">
          <InlineNotice tone="neutral">
            Map veto unavailable for this session. Lobby code is available.
          </InlineNotice>
        </div>
      </motion.section>
    );
  }

  return null;
}
