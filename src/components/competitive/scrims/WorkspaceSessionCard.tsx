import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Info } from 'lucide-react';
import { StatusPill, InlineNotice, Field } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import {
  useUpdateSessionLobby,
  useCheckInSession,
  useConfirmScrimResult,
  useStartScrimSession,
  useCompleteScrimSession,
  useCancelScrimSession,
  useReportScrimResult,
  useOpenDispute,
} from '@/hooks/competitive/useScrims';
import { getLobbyFormat } from '@/services/gameLobbyFormat';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { ScrimSession } from '@/types/competitive';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SESSION_TONE = {
  scheduled: 'neutral',
  in_progress: 'accent',
  completed: 'success',
  cancelled: 'neutral',
  disputed: 'warning',
} as const;

function formatSessionDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${weekday} ${date} · ${time}`;
}

function isWithin30Min(scheduledAt: string | null): boolean {
  if (!scheduledAt) return false;
  const now = Date.now();
  const then = new Date(scheduledAt).getTime();
  const diff = then - now;
  return diff >= -5 * 60_000 && diff <= 30 * 60_000;
}

// ── Report result form ────────────────────────────────────────────────────────

function ReportResultForm({
  session,
  teamId,
  onClose,
}: {
  session: ScrimSession;
  teamId: string;
  onClose: () => void;
}) {
  const reportMutation = useReportScrimResult(session.id);
  const [t1Score, setT1Score] = useState('');
  const [t2Score, setT2Score] = useState('');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    const s1 = parseInt(t1Score, 10);
    const s2 = parseInt(t2Score, 10);
    if (isNaN(s1) || isNaN(s2)) {
      setApiError('Both scores are required.');
      return;
    }
    try {
      await reportMutation.mutateAsync({
        reportingTeamId: teamId,
        team1Score: s1,
        team2Score: s2,
      });
      onClose();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not submit result. Try again.'));
    }
  }

  return (
    <div className="border-t border-white/[0.06] pt-3 space-y-3">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
        REPORT RESULT
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={session.team1Name ?? 'Team 1 score'} htmlFor={`rs-t1-${session.id}`}>
          <input
            id={`rs-t1-${session.id}`}
            type="number"
            min={0}
            value={t1Score}
            onChange={(e) => setT1Score(e.target.value)}
            placeholder="0"
            className="h-9 w-full border border-white/10 bg-black/30 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
        <Field label={session.team2Name ?? 'Team 2 score'} htmlFor={`rs-t2-${session.id}`}>
          <input
            id={`rs-t2-${session.id}`}
            type="number"
            min={0}
            value={t2Score}
            onChange={(e) => setT2Score(e.target.value)}
            placeholder="0"
            className="h-9 w-full border border-white/10 bg-black/30 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
      </div>
      {apiError && <p role="alert" className="text-xs text-red-300">{apiError}</p>}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-[13px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={reportMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-4 text-[13px]"
        >
          {reportMutation.isPending ? 'Saving…' : 'Submit'}
        </Button>
      </div>
    </div>
  );
}

// ── Dispute form ──────────────────────────────────────────────────────────────

function DisputeForm({
  session,
  teamId,
  onClose,
}: {
  session: ScrimSession;
  teamId: string;
  onClose: () => void;
}) {
  const disputeMutation = useOpenDispute(session.id);
  const [reason, setReason] = useState('');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    if (!reason.trim()) { setApiError('Reason is required.'); return; }
    try {
      await disputeMutation.mutateAsync({ raisedByTeamId: teamId, reason: reason.trim() });
      onClose();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not raise dispute. Try again.'));
    }
  }

  return (
    <div className="border-t border-white/[0.06] pt-3 space-y-3">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
        RAISE DISPUTE
      </p>
      <Field label="Reason" htmlFor={`dr-${session.id}`}>
        <textarea
          id={`dr-${session.id}`}
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 1000))}
          placeholder="Describe the issue…"
          rows={3}
          className="w-full border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
        />
        <p className="text-[11px] text-white/25 mt-1">{reason.length}/1000</p>
      </Field>
      {apiError && <p role="alert" className="text-xs text-red-300">{apiError}</p>}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-[13px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={disputeMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-4 text-[13px]"
        >
          {disputeMutation.isPending ? 'Submitting…' : 'Raise dispute'}
        </Button>
      </div>
    </div>
  );
}

// ── Lobby fields ──────────────────────────────────────────────────────────────

function LobbyFields({ session }: { session: ScrimSession }) {
  const prefersReducedMotion = useReducedMotion();
  const lobbyMutation = useUpdateSessionLobby(session.id);
  const fmt = getLobbyFormat(session.gameSlug ?? '');

  const [fieldOne, setFieldOne] = useState(session.lobbyCode ?? '');
  const [fieldTwo, setFieldTwo] = useState(session.serverInfo ?? '');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDirty = fieldOne !== (session.lobbyCode ?? '') || fieldTwo !== (session.serverInfo ?? '');

  async function handleSave() {
    await lobbyMutation.mutateAsync({ lobbyCode: fieldOne, serverInfo: fieldTwo });
    setSavedAt(Date.now());
    savedTimerRef.current = setTimeout(() => setSavedAt(null), 2000);
  }

  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-[11px] text-white/40">{fmt.fieldOneLabel}</p>
          <input
            value={fieldOne}
            onChange={(e) => setFieldOne(e.target.value)}
            placeholder={fmt.fieldOneHint}
            aria-label={fmt.fieldOneLabel}
            className="h-9 w-full border border-white/10 bg-black/30 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-white/40">{fmt.fieldTwoLabel}</p>
          <input
            value={fieldTwo}
            onChange={(e) => setFieldTwo(e.target.value)}
            placeholder={fmt.fieldTwoHint}
            aria-label={fmt.fieldTwoLabel}
            className="h-9 w-full border border-white/10 bg-black/30 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isDirty && (
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={lobbyMutation.isPending}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.97, transition: { duration: 0.12 } }}
            className="text-[12px] text-white/55 hover:text-white border border-white/[0.08] px-3 py-1 transition-opacity disabled:opacity-70"
          >
            {lobbyMutation.isPending ? 'Saving…' : 'Save lobby'}
          </motion.button>
        )}
        {savedAt && (
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 1 }}
            animate={prefersReducedMotion ? undefined : { opacity: 0, transition: { delay: 1.7, duration: 0.3 } }}
          >
            <InlineNotice tone="success">Saved</InlineNotice>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Check-in zone ─────────────────────────────────────────────────────────────

function CheckInZone({
  session,
  teamId,
  opponentName,
}: {
  session: ScrimSession;
  teamId: string;
  opponentName: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const checkInMutation = useCheckInSession(session.id);

  const myCheckIn =
    session.team1Id === teamId ? session.team1CheckedInAt : session.team2CheckedInAt;
  const opponentCheckIn =
    session.team1Id === teamId ? session.team2CheckedInAt : session.team1CheckedInAt;

  const bothCheckedIn = !!(myCheckIn && opponentCheckIn);
  const iCheckedIn = !!myCheckIn;

  const arriveProps = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.18 } } };

  if (bothCheckedIn) {
    return (
      <motion.div {...arriveProps}>
        <InlineNotice tone="success">Both teams checked in. Good luck.</InlineNotice>
      </motion.div>
    );
  }

  if (iCheckedIn) {
    return (
      <motion.div {...arriveProps}>
        <div className="flex items-center gap-3 border px-4 py-3 border-rose-500/30 bg-rose-500/10">
          <Info className="h-4 w-4 text-rose-300 shrink-0" aria-hidden />
          <p className="text-[13px] text-zinc-300">
            You&apos;re checked in. Waiting for {opponentName}.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex items-center gap-3 border px-4 py-3 border-rose-500/30 bg-rose-500/10">
      <Info className="h-4 w-4 text-rose-300 shrink-0" aria-hidden />
      <p className="text-[13px] text-zinc-300 flex-1">Check-in is open.</p>
      <Button
        size="sm"
        onClick={() => checkInMutation.mutate()}
        disabled={checkInMutation.isPending}
        className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[12px] shrink-0"
      >
        {checkInMutation.isPending ? '…' : 'Check in'}
      </Button>
    </div>
  );
}

// ── Main session card ─────────────────────────────────────────────────────────

export function WorkspaceSessionCard({
  session,
  teamId,
}: {
  session: ScrimSession;
  teamId: string;
}) {
  const [showReport, setShowReport] = useState(false);
  const [showDispute, setShowDispute] = useState(false);

  const startMutation = useStartScrimSession(session.id);
  const completeMutation = useCompleteScrimSession(session.id);
  const cancelMutation = useCancelScrimSession(session.id);
  const confirmMutation = useConfirmScrimResult(session.id);
  const isPending = startMutation.isPending || completeMutation.isPending || cancelMutation.isPending;

  const iAmTeam1 = session.team1Id === teamId;
  const opponentName = (iAmTeam1 ? session.team2Name : session.team1Name) ?? 'Opponent';
  const opponentReported = iAmTeam1 ? session.resultReportedByTeam2 : session.resultReportedByTeam1;

  const showLobby = session.status === 'scheduled' || session.status === 'in_progress';
  const showCheckIn = session.status === 'scheduled' && isWithin30Min(session.scheduledAt);
  const showConfirmRow =
    opponentReported &&
    (session.status === 'scheduled' || session.status === 'in_progress');

  const gameAbbrev = session.gameSlug?.toUpperCase().slice(0, 3) ?? null;
  const durationLabel = session.durationMinutes ? `${session.durationMinutes} min` : null;

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
      {/* Row 1 — opponent + status + open room */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[15px] font-semibold text-white truncate">
            vs {opponentName}
          </p>
          <StatusPill
            label={session.status.replace('_', ' ').toUpperCase()}
            tone={SESSION_TONE[session.status]}
            className="mt-1"
          />
        </div>
        <Link
          to={`/competitive/scrims/sessions/${session.id}`}
          className="shrink-0 text-[12px] text-white/50 hover:text-white border border-white/[0.08] px-2.5 py-1 transition-colors"
        >
          Open room
        </Link>
      </div>

      {/* Row 2 — time + duration + game */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[13px] text-white/70">{formatSessionDate(session.scheduledAt)}</span>
        {durationLabel && <span className="text-[12px] text-white/40">{durationLabel}</span>}
        {gameAbbrev && (
          <span className="font-mono text-[10px] text-white/30">{gameAbbrev}</span>
        )}
      </div>

      {/* Row 3 — lobby fields */}
      {showLobby && <LobbyFields session={session} />}

      {/* Row 4 — check-in zone */}
      {showCheckIn && (
        <CheckInZone session={session} teamId={teamId} opponentName={opponentName} />
      )}

      {/* Row 5 — result confirmation */}
      {showConfirmRow && (
        <div className="space-y-2">
          <InlineNotice tone="warning">The opposing team submitted a result.</InlineNotice>
          <p className="text-[13px] text-white/55">
            {session.team1Name ?? 'Team 1'} {session.team1Score ?? '?'} –{' '}
            {session.team2Score ?? '?'} {session.team2Name ?? 'Team 2'}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="text-[12px] text-emerald-300 hover:text-emerald-200 rounded-none border border-white/[0.08]"
            >
              {confirmMutation.isPending ? '…' : 'Confirm result'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDispute(true)}
              className="text-[12px] text-amber-300/70 hover:text-amber-300 rounded-none border border-white/[0.08]"
            >
              Raise dispute
            </Button>
          </div>
        </div>
      )}

      {/* Row 6 — report result toggle */}
      {(session.status === 'in_progress' || session.status === 'completed') && !showReport && (
        <button
          type="button"
          onClick={() => setShowReport(true)}
          className="text-[12px] text-white/40 hover:text-white/70 transition-colors"
        >
          Report result
        </button>
      )}

      {/* Actions row */}
      <div className="flex gap-2 flex-wrap">
        {session.status === 'scheduled' && (
          <>
            <Button
              size="sm"
              onClick={() => startMutation.mutate()}
              disabled={isPending}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[12px]"
            >
              {startMutation.isPending ? '…' : 'Start'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => cancelMutation.mutate()}
              disabled={isPending}
              className="text-[12px] text-red-300/70 hover:text-red-300 rounded-none"
            >
              {cancelMutation.isPending ? '…' : 'Cancel'}
            </Button>
          </>
        )}
        {session.status === 'in_progress' && (
          <>
            <Button
              size="sm"
              onClick={() => completeMutation.mutate()}
              disabled={isPending}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[12px]"
            >
              {completeMutation.isPending ? '…' : 'Complete'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDispute(true)}
              className="text-[12px] text-amber-300/70 hover:text-amber-300 rounded-none border border-white/[0.08]"
            >
              Raise dispute
            </Button>
          </>
        )}
        {session.status === 'disputed' && (
          <Link
            to={`/disputes?session=${session.id}`}
            className="text-[12px] text-white/55 hover:text-white border border-white/[0.08] px-2.5 py-1 transition-colors"
          >
            View dispute
          </Link>
        )}
      </div>

      {/* Inline forms */}
      {showReport && (
        <ReportResultForm
          session={session}
          teamId={teamId}
          onClose={() => setShowReport(false)}
        />
      )}
      {showDispute && (
        <DisputeForm
          session={session}
          teamId={teamId}
          onClose={() => setShowDispute(false)}
        />
      )}
    </div>
  );
}
