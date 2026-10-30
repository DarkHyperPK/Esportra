/**
 * ScrimCheckinPanel — PROJ-078 Surface 1 (CL-007-S1)
 *
 * Direction: Broadcast (lead) + Community blend.
 * Hero: countdown in minutes:seconds (36px mono bold, rose-bordered container).
 * 9 states per direction contract.
 * UX risk 1 (clock skew): countdown derived from server timestamp checkinWindowOpenedAt, not client estimate.
 * UX risk 2 (button reach): full-width button inline; sticky ActionBar on mobile widths.
 */

import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { InlineNotice, StatusPill, EYEBROW_CLASS } from '@/components/ui/kit';
import { Countdown } from '@/components/ui/Countdown';
import { useScrimCheckin } from '@/hooks/competitive/useScrims';
import type { ScrimSession } from '@/types/competitive';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScrimCheckinPanelProps {
  session: ScrimSession;
  callerTeamId: string;
  isCaptain: boolean;
  onCheckinSuccess: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PANEL = 'border border-white/[0.08] bg-zinc-900/50 p-4 space-y-3';
const WINDOW_OPEN_MS = 30 * 60_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function windowCloseTarget(checkinWindowOpenedAt: string): number {
  return new Date(checkinWindowOpenedAt).getTime() + WINDOW_OPEN_MS;
}

function deriveTeamCheckinState(session: ScrimSession, callerTeamId: string) {
  const myTeamSide = session.team1Id === callerTeamId ? 1 : session.team2Id === callerTeamId ? 2 : null;
  const t1In = !!session.team1CheckedInAt;
  const t2In = !!session.team2CheckedInAt;
  const myIn = myTeamSide === 1 ? t1In : myTeamSide === 2 ? t2In : false;
  const bothIn = t1In && t2In;
  const opponentName = myTeamSide === 1 ? (session.team2Name ?? 'Opponent') : (session.team1Name ?? 'Opponent');
  return { myTeamSide, t1In, t2In, myIn, bothIn, opponentName };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function ScrimCheckinSkeleton() {
  return (
    <div className={`${PANEL} animate-pulse`} aria-busy="true" aria-label="Loading check-in">
      <div className="h-3 w-16 bg-white/[0.06] rounded-none" />
      <div className="space-y-2">
        <div className="h-12 bg-white/[0.04] border border-white/[0.04]" />
        <div className="h-12 bg-white/[0.04] border border-white/[0.04]" />
      </div>
      <div className="h-9 w-40 bg-white/[0.04] border border-white/[0.04]" />
    </div>
  );
}

// ── Team status row ───────────────────────────────────────────────────────────

function TeamStatusRow({ name, checkedIn }: { name: string; checkedIn: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-[44px] px-0">
      <div className="flex items-center gap-2 min-w-0">
        <span
          aria-hidden
          className={`h-3 w-3 rounded-full shrink-0 ${checkedIn ? 'bg-emerald-400' : 'bg-zinc-500'}`}
        />
        <span className="text-[14px] text-white truncate">{name}</span>
      </div>
      <StatusPill
        label={checkedIn ? 'Checked in' : 'Not yet'}
        tone={checkedIn ? 'success' : 'neutral'}
      />
    </div>
  );
}

// ── ScrimCheckinPanel ─────────────────────────────────────────────────────────

export function ScrimCheckinPanel({ session, callerTeamId, isCaptain, onCheckinSuccess }: ScrimCheckinPanelProps) {
  const checkIn = useScrimCheckin(session.id);
  const reduce = useReducedMotion();

  const { myTeamSide, t1In, t2In, myIn, bothIn, opponentName } = deriveTeamCheckinState(session, callerTeamId);
  const t1Name = session.team1Name ?? 'Team 1';
  const t2Name = session.team2Name ?? 'Team 2';

  const windowOpen = !!session.checkinWindowOpenedAt;
  const cancelled = session.status === 'cancelled';

  const fadeIn = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.18, ease: 'easeOut' } };

  const verdictFadeIn = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.18, ease: 'easeOut' } };

  const windowCloseMs = session.checkinWindowOpenedAt ? windowCloseTarget(session.checkinWindowOpenedAt) : null;

  async function handleCheckin() {
    try {
      await checkIn.mutateAsync();
      onCheckinSuccess();
    } catch {
      // error surfaced via checkIn.isError
    }
  }

  // ── S1-6: Cancelled (timeout) ──────────────────────────────────────────────
  if (cancelled) {
    return (
      <motion.section aria-labelledby="checkin-title" className={PANEL} {...fadeIn}>
        <p id="checkin-title" className={EYEBROW_CLASS}>CHECK-IN</p>
        <InlineNotice tone="critical">
          Session cancelled — check-in timed out. Contact your opponent if you believe this is wrong.
        </InlineNotice>
      </motion.section>
    );
  }

  // ── S1-5: Both checked in ─────────────────────────────────────────────────
  if (bothIn) {
    return (
      <motion.section aria-labelledby="checkin-title" className={PANEL} {...verdictFadeIn}>
        <p id="checkin-title" className={EYEBROW_CLASS}>CHECK-IN</p>
        <TeamStatusRow name={t1Name} checkedIn={true} />
        <TeamStatusRow name={t2Name} checkedIn={true} />
        <AnimatePresence>
          <motion.div key="both-in" {...verdictFadeIn}>
            <InlineNotice tone="success">Both teams checked in — session is live.</InlineNotice>
          </motion.div>
        </AnimatePresence>
      </motion.section>
    );
  }

  // ── S1-1: Window not yet open ─────────────────────────────────────────────
  if (!windowOpen) {
    return (
      <motion.section aria-labelledby="checkin-title" className={PANEL} {...fadeIn}>
        <p id="checkin-title" className={EYEBROW_CLASS}>CHECK-IN</p>
        <TeamStatusRow name={t1Name} checkedIn={t1In} />
        <TeamStatusRow name={t2Name} checkedIn={t2In} />
        <InlineNotice tone="neutral">Check-in opens 15 minutes before the match.</InlineNotice>
      </motion.section>
    );
  }

  // ── S1-2 / S1-3 / S1-4: Window open ──────────────────────────────────────
  const isCapAndNotIn = isCaptain && !myIn && myTeamSide !== null;
  const isNonCapAndNotIn = !isCaptain && myTeamSide !== null && !myIn;

  const checkInButton = isCapAndNotIn ? (
    <button
      onClick={() => void handleCheckin()}
      disabled={checkIn.isPending}
      aria-busy={checkIn.isPending}
      className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-[14px] font-medium px-6 py-3 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
      style={{ boxShadow: '0 0 12px 0 rgba(255,45,85,0.35)' }}
    >
      {checkIn.isPending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>Checking in…</span>
        </span>
      ) : (
        'Check in your team'
      )}
    </button>
  ) : null;

  return (
    <motion.section aria-labelledby="checkin-title" className={PANEL} {...fadeIn}>
      <p id="checkin-title" className={EYEBROW_CLASS}>CHECK-IN</p>

      {/* Team status rows */}
      <TeamStatusRow name={t1Name} checkedIn={t1In} />
      <TeamStatusRow name={t2Name} checkedIn={t2In} />

      {/* Countdown block — rose left-border cue (UX risk 1: uses server timestamp) */}
      {windowCloseMs !== null && (
        <div className="border-l-2 border-rose-500 pl-4 space-y-0.5">
          <p className="text-[11px] text-zinc-400">time remaining</p>
          <Countdown
            targetDate={windowCloseMs}
            className="text-[36px] font-bold text-white tabular-nums"
            aria-live="polite"
          />
        </div>
      )}

      {/* State-dependent action area */}
      <div className="space-y-2">
        {/* S1-4: My team in, opponent pending */}
        {myIn && !bothIn && (
          <InlineNotice tone="neutral">
            You&apos;re checked in. Waiting for {opponentName}.
          </InlineNotice>
        )}

        {/* S1-3: Non-captain, window open */}
        {isNonCapAndNotIn && (
          <InlineNotice tone="neutral">Your captain checks the team in.</InlineNotice>
        )}

        {/* S1-7: Error */}
        {checkIn.isError && !checkIn.isWindowNotOpen && (
          <div className="space-y-2">
            <InlineNotice tone="critical">Couldn&apos;t check in. Try again.</InlineNotice>
            <button
              onClick={() => void handleCheckin()}
              className="text-[13px] border border-white/[0.08] text-white/55 hover:text-white px-4 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {checkIn.isWindowNotOpen && (
          <InlineNotice tone="warning">
            Check-in window is not open yet. Wait for the notification.
          </InlineNotice>
        )}
      </div>

      {/* S1-2: Full-width captain button inline (UX risk 2: placed directly after countdown) */}
      {checkInButton && <div className="pt-1">{checkInButton}</div>}
    </motion.section>
  );
}
