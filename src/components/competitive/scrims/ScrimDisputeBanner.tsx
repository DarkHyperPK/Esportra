/**
 * ScrimDisputeBanner — PROJ-078 Surface 4 (CL-007-S4)
 *
 * Direction: Broadcast (lead). Community blend explicitly suspended.
 * Archetype: Verdict (persistent at top of page).
 * Hero: dispute reason text open / outcome resolved.
 * UX risk 5 (reason text): line-clamp-3 with expand toggle.
 * No animation per direction contract (dispute is a fact, not an alert).
 * States: S4-0 through S4-7 per direction contract.
 */

import { SCRIM_LABEL } from './scrimCardStyles';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import {InlineNotice} from '@/components/ui/kit';
import { useSubmitDisputeEvidence } from '@/hooks/competitive/useScrims';
import { DisputeEvidenceInput } from './room/DisputeEvidenceInput';
import { formatDistanceToNow } from 'date-fns';
import type { ScrimDispute, ScrimDisputeOutcome } from '@/types/competitive';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScrimDisputeBannerProps {
  dispute: ScrimDispute | null;
  callerTeamId: string;
  sessionTeam1Id: string;
  sessionId: string;
  isCaptain: boolean;
  onEvidenceSubmitted: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EVIDENCE_WINDOW_MS = 48 * 60 * 60_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function outcomeLabel(outcome: ScrimDisputeOutcome): string {
  switch (outcome) {
    case 'team1_wins': return 'Team 1 wins';
    case 'team2_wins': return 'Team 2 wins';
    case 'no_contest': return 'No contest';
  }
}

function isEvidenceWindowOpen(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < EVIDENCE_WINDOW_MS;
}

// ── EvidenceChip ──────────────────────────────────────────────────────────────

function EvidenceChip({ submitted, closed }: { submitted: boolean; closed: boolean }) {
  if (closed) {
    return (
      <span className="text-[11px] font-medium text-zinc-500 border border-zinc-700/40 px-2 py-0.5">
        Window closed
      </span>
    );
  }
  return (
    <span
      className={`text-[11px] font-medium px-2 py-0.5 border ${
        submitted
          ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
          : 'text-zinc-400 border-zinc-600/40 bg-transparent'
      }`}
    >
      {submitted ? 'Submitted' : 'Not submitted'}
    </span>
  );
}

// ── EvidenceForm ──────────────────────────────────────────────────────────────

function EvidenceForm({
  sessionId,
  gameNumber,
  onSubmitted,
}: {
  sessionId: string;
  gameNumber?: number | null;
  onSubmitted: () => void;
}) {
  const submit = useSubmitDisputeEvidence(sessionId, gameNumber);
  const [urls, setUrls] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState(false);

  async function handleSubmit() {
    setSubmitError(false);
    if (urls.length === 0) return;
    try {
      await submit.mutateAsync(urls);
      onSubmitted();
    } catch {
      setSubmitError(true);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <p className={SCRIM_LABEL}>Your evidence</p>
      <DisputeEvidenceInput sessionId={sessionId} urls={urls} onChange={setUrls} />

      {submitError && (
        <div role="alert">
          <InlineNotice tone="critical">Couldn&apos;t submit evidence. Try again.</InlineNotice>
        </div>
      )}

      <button
        onClick={() => void handleSubmit()}
        disabled={submit.isPending || urls.length === 0}
        aria-busy={submit.isPending}
        className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-[13px] px-4 py-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
      >
        {submit.isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Submitting…
          </span>
        ) : (
          'Submit evidence'
        )}
      </button>
    </div>
  );
}

// ── ScrimDisputeBanner ────────────────────────────────────────────────────────

export function ScrimDisputeBanner({
  dispute,
  callerTeamId,
  sessionTeam1Id,
  sessionId,
  isCaptain,
  onEvidenceSubmitted,
}: ScrimDisputeBannerProps) {
  const reduce = useReducedMotion();
  const [reasonExpanded, setReasonExpanded] = useState(false);

  // S4-0: No dispute
  if (!dispute) return null;

  const fadeIn = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.18, ease: 'easeOut' } };

  const windowOpen = isEvidenceWindowOpen(dispute.createdAt);
  const timeSince = formatDistanceToNow(new Date(dispute.createdAt), { addSuffix: false });

  const isRaisingTeam = dispute.raisedByTeamId === callerTeamId;
  const isRespondingTeam = !isRaisingTeam;
  const respondingTeamId = dispute.raisedByTeamId === sessionTeam1Id
    ? 'team2'
    : 'team1';
  const responderHasSubmitted = !!(dispute.responderEvidenceUrls?.length);
  const raisingTeamHasSubmitted = !!(dispute.evidenceUrls?.length);

  // Determine if the responding captain should see the evidence form
  const canSubmitEvidence =
    isCaptain &&
    isRespondingTeam &&
    dispute.status !== 'resolved' &&
    !responderHasSubmitted;

  // S4-5: Resolved
  if (dispute.status === 'resolved' && dispute.outcome) {
    return (
      <motion.div role="note" aria-label="Dispute resolved" {...fadeIn}>
        <InlineNotice tone="success">
          <div className="space-y-1">
            <p className="text-[14px] font-medium text-white">{outcomeLabel(dispute.outcome)}</p>
            {dispute.resolutionNotes && (
              <p className="text-[12px] text-zinc-400">{dispute.resolutionNotes}</p>
            )}
          </div>
        </InlineNotice>
      </motion.div>
    );
  }

  // S4-1 / S4-2 / S4-3 / S4-4: Dispute open or escalated
  return (
    <motion.section aria-labelledby="dispute-title" {...fadeIn}>
      <InlineNotice tone="warning">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p id="dispute-title" className={`${SCRIM_LABEL} text-amber-300`}>DISPUTE</p>
            <p className="text-[11px] text-zinc-500 shrink-0">Opened {timeSince} ago</p>
          </div>

          {/* UX risk 5: reason clamped to 3 lines with expand toggle */}
          <div>
            <p
              className={`text-[14px] font-medium text-white ${reasonExpanded ? '' : 'line-clamp-3'}`}
            >
              {dispute.reason}
            </p>
            {dispute.reason.length > 120 && (
              <button
                onClick={() => setReasonExpanded((v) => !v)}
                className="mt-1 text-[12px] text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
              >
                {reasonExpanded ? 'Show less' : 'Expand'}
              </button>
            )}
          </div>

          {/* Per-team evidence rows */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-zinc-300">
                {dispute.raisedByTeamId === sessionTeam1Id ? 'Team 1' : 'Team 2'} (raised dispute)
              </span>
              <EvidenceChip submitted={raisingTeamHasSubmitted} closed={!windowOpen} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-zinc-300">
                {respondingTeamId === 'team1' ? 'Team 1' : 'Team 2'} (responding)
              </span>
              <EvidenceChip submitted={responderHasSubmitted} closed={!windowOpen} />
            </div>
          </div>

          {/* S4-2: Evidence form for responding captain within 48h */}
          {canSubmitEvidence && windowOpen && (
            <EvidenceForm sessionId={sessionId} gameNumber={dispute.gameNumber} onSubmitted={onEvidenceSubmitted} />
          )}

          {/* S4-3: Evidence window closed */}
          {!windowOpen && !dispute.resolvedAt && (
            <div className="opacity-40 pointer-events-none">
              <p className="text-[11px] text-zinc-500 mt-2">Evidence window closed</p>
            </div>
          )}
        </div>
      </InlineNotice>
    </motion.section>
  );
}
