import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { InlineNotice, StatusPill } from '@/components/ui/kit';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { ScrimCheckinPanel, ScrimCheckinSkeleton } from '@/components/competitive/scrims/ScrimCheckinPanel';
import { ScrimVetoSection } from '@/components/competitive/scrims/ScrimVetoSection';
import { ScrimDisputeBanner } from '@/components/competitive/scrims/ScrimDisputeBanner';
import { ScrimRiotMatchPicker } from '@/components/competitive/scrims/ScrimRiotMatchPicker';
import { ScrimOcrUpload } from '@/components/competitive/scrims/ScrimOcrUpload';
import {
  useScrimSession,
  useUpdateSessionLobby,
  useReportScrimResult,
  useConfirmScrimResult,
  useOpenDispute,
} from '@/hooks/competitive/useScrims';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { getLobbyFormat } from '@/services/gameLobbyFormat';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { ScrimSession, ScrimSessionStatus } from '@/types/competitive';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_TONE: Record<ScrimSessionStatus, 'neutral' | 'accent' | 'success' | 'warning' | 'critical'> = {
  scheduled: 'neutral',
  in_progress: 'accent',
  completed: 'success',
  cancelled: 'neutral',
  disputed: 'warning',
};
const EYEBROW = 'font-mono text-[10px] tracking-[0.28em] text-zinc-500 uppercase';
const PANEL = 'border border-white/[0.08] bg-white/[0.03] p-4 space-y-3';
const GHOST = 'text-[13px] border border-white/[0.08] text-white/55 hover:text-white rounded-none px-4 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';
const FIELD = 'h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors';

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatSessionTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}


function getLobbyFieldValues(s: ScrimSession) {
  return s.gameSlug === 'cs2'
    ? { field1: s.serverInfo ?? '', field2: s.lobbyCode ?? '' }
    : { field1: s.lobbyCode ?? '', field2: s.serverInfo ?? '' };
}

function fieldsToPayload(gameSlug: string | null, f1: string, f2: string) {
  return gameSlug === 'cs2'
    ? { serverInfo: f1 || undefined, lobbyCode: f2 || undefined }
    : { lobbyCode: f1 || undefined, serverInfo: f2 || undefined };
}

// ── Small building blocks ─────────────────────────────────────────────────────

function SessionSkeleton() {
  return (
    <div className="space-y-6 px-4 lg:px-8 pt-8">
      <div className="h-4 w-24 bg-white/[0.06] animate-pulse" />
      <div className="h-32 bg-white/[0.04] border border-white/[0.06] animate-pulse" />
      <ScrimCheckinSkeleton />
      <div className="h-24 bg-white/[0.04] border border-white/[0.06] animate-pulse" />
    </div>
  );
}

function TeamAvatar({ name, logoUrl, large }: { name: string; logoUrl?: string | null; large?: boolean }) {
  const dim = large ? 'h-14 w-14' : 'h-10 w-10';
  const font = large ? 'text-[16px]' : 'text-[13px]';
  if (logoUrl) return <img src={logoUrl} alt={name} className={`${dim} object-cover shrink-0`} />;
  return (
    <div className={`${dim} bg-white/[0.08] flex items-center justify-center font-mono ${font} text-white/60 shrink-0`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function TeamPanel({
  name, logoUrl, checkedIn, label, cancelled, large,
}: {
  name: string; logoUrl?: string | null; checkedIn: boolean;
  label?: string; cancelled: boolean; large?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <TeamAvatar name={name} logoUrl={logoUrl} large={large} />
      <p className={`font-heading font-bold text-center ${large ? 'text-[18px]' : 'text-[16px]'} ${cancelled ? 'text-white/40' : 'text-white'}`}>
        {name}
      </p>
      {label && <p className="text-[11px] text-white/35 text-center">{label}</p>}
      <p className={`text-[12px] ${checkedIn ? 'text-emerald-400' : 'text-white/30'}`}>
        {checkedIn ? 'Checked in' : 'Waiting'}
      </p>
    </div>
  );
}

// ── FaceOffLockup ─────────────────────────────────────────────────────────────

function FaceOffLockup({ session, myTeamSide }: { session: ScrimSession; myTeamSide: 1 | 2 | null }) {
  const cancelled = session.status === 'cancelled';
  const t1 = {
    name: session.team1Name ?? 'Team 1', logoUrl: session.team1Logo,
    checkedIn: !!session.team1CheckedInAt, cancelled,
    label: myTeamSide === 1 ? 'Your team' : myTeamSide === 2 ? 'Opponent' : undefined,
  };
  const t2 = {
    name: session.team2Name ?? 'Team 2', logoUrl: session.team2Logo,
    checkedIn: !!session.team2CheckedInAt, cancelled,
    label: myTeamSide === 2 ? 'Your team' : myTeamSide === 1 ? 'Opponent' : undefined,
  };

  return (
    <div className="py-8 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {session.gameSlug && (
          <span className="font-mono text-[10px] tracking-[0.2em] text-white/35 bg-white/[0.05] px-1.5 py-0.5">
            {session.gameSlug.toUpperCase()}
          </span>
        )}
        {session.modeKey && <span className="text-[12px] text-white/45">{session.modeKey}</span>}
        {session.scheduledAt && (
          <span className="text-[13px] text-white/70 font-medium">{formatSessionTime(session.scheduledAt)}</span>
        )}
        {session.durationMinutes && <span className="text-[12px] text-white/40">90-min block</span>}
      </div>

      <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] items-center gap-6">
        <TeamPanel {...t1} large />
        <span className="font-mono text-[13px] tracking-[0.2em] text-white/20">VS</span>
        <TeamPanel {...t2} large />
      </div>
      <div className="flex flex-col items-center gap-2 sm:hidden">
        <TeamPanel {...t1} />
        <span className="font-mono text-[12px] text-white/20 my-2">VS</span>
        <TeamPanel {...t2} />
      </div>

      <div className="flex justify-center">
        <StatusPill label={session.status.replace('_', ' ').toUpperCase()} tone={STATUS_TONE[session.status]} />
      </div>
    </div>
  );
}

// ── LobbyInfoPanel ────────────────────────────────────────────────────────────

function LobbyInfoPanel({ session }: { session: ScrimSession }) {
  const fmt = getLobbyFormat(session.gameSlug ?? '');
  const saved = getLobbyFieldValues(session);
  const [f1, setF1] = useState(saved.field1);
  const [f2, setF2] = useState(saved.field2);
  const [flash, setFlash] = useState(false);
  const update = useUpdateSessionLobby(session.id);
  const locked = session.status === 'completed' || session.status === 'cancelled';
  const dirty = f1 !== saved.field1 || f2 !== saved.field2;

  async function save() {
    setFlash(false);
    try {
      await update.mutateAsync(fieldsToPayload(session.gameSlug, f1, f2));
      setFlash(true);
      setTimeout(() => setFlash(false), 2000);
    } catch { /* shown via update.isError */ }
  }

  return (
    <div className={PANEL}>
      <p className={EYEBROW}>Lobby Info</p>
      {locked ? (
        <div className="space-y-3">
          {[{ label: fmt.fieldOneLabel, val: f1 }, { label: fmt.fieldTwoLabel, val: f2 }].map(({ label, val }) => (
            <div key={label} className="space-y-1">
              <p className="text-[11px] text-white/40">{label}</p>
              <p className="text-[14px] text-white/70">{val || <span className="text-white/25">—</span>}</p>
            </div>
          ))}
          <p className="text-[11px] text-white/30">Session ended.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="lf1" className="block text-[11px] text-white/40">{fmt.fieldOneLabel}</label>
            <input id="lf1" value={f1} onChange={(e) => setF1(e.target.value)} placeholder={fmt.fieldOneHint} className={FIELD} />
          </div>
          <div className="space-y-1">
            <label htmlFor="lf2" className="block text-[11px] text-white/40">{fmt.fieldTwoLabel}</label>
            <input id="lf2" value={f2} onChange={(e) => setF2(e.target.value)} placeholder={fmt.fieldTwoHint} className={FIELD} />
          </div>
          <p className="text-[11px] text-white/30">Either team can update lobby info.</p>
          {dirty && (
            <div className="flex justify-end mt-2">
              <button onClick={save} disabled={update.isPending} className={GHOST}>
                {update.isPending ? 'Saving…' : 'Save lobby info'}
              </button>
            </div>
          )}
          {flash && <InlineNotice tone="success">Lobby info saved.</InlineNotice>}
          {update.isError && <InlineNotice tone="critical">Could not save lobby info. Try again.</InlineNotice>}
        </div>
      )}
    </div>
  );
}

// ── ReportForm ────────────────────────────────────────────────────────────────

function ReportForm({
  sessionId, gameSlug, myTeamId, t1Name, t2Name, defaultT1, defaultT2, onSuccess, onCancel,
}: {
  sessionId: string; gameSlug: string | null; myTeamId: string | null;
  t1Name: string; t2Name: string; defaultT1: string; defaultT2: string;
  onSuccess: () => void; onCancel: () => void;
}) {
  const report = useReportScrimResult(sessionId);
  const [s1, setS1] = useState(defaultT1);
  const [s2, setS2] = useState(defaultT2);
  const [notes, setNotes] = useState('');
  const isValorant = gameSlug === 'valorant';

  function fillScores(team1Score: number, team2Score: number) {
    setS1(String(team1Score));
    setS2(String(team2Score));
  }

  async function submit() {
    if (!myTeamId) return;
    const n1 = Number(s1), n2 = Number(s2);
    if (isNaN(n1) || isNaN(n2)) return;
    try {
      await report.mutateAsync({ reportingTeamId: myTeamId, team1Score: n1, team2Score: n2, notes: notes.trim() || undefined });
      onSuccess();
    } catch { /* shown via report.isError */ }
  }

  return (
    <div className="space-y-4">
      {/* Riot match picker — Valorant only */}
      {isValorant && (
        <div className="border border-white/[0.05] bg-black/20 p-3 space-y-2">
          <ScrimRiotMatchPicker
            sessionId={sessionId}
            isValorant={isValorant}
            onFill={fillScores}
          />
        </div>
      )}

      {/* Screenshot OCR upload */}
      <div className="border border-white/[0.05] bg-black/20 p-3">
        <ScrimOcrUpload
          sessionId={sessionId}
          t1Name={t1Name}
          t2Name={t2Name}
          onFill={fillScores}
        />
      </div>

      {/* Manual score inputs */}
      <div className="space-y-3">
        <p className={EYEBROW}>Manual entry</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="rs1" className="block text-[11px] text-white/55">{t1Name} Score</label>
            <input id="rs1" type="number" min={0} value={s1} onChange={(e) => setS1(e.target.value)} className={FIELD} />
          </div>
          <div className="space-y-1">
            <label htmlFor="rs2" className="block text-[11px] text-white/55">{t2Name} Score</label>
            <input id="rs2" type="number" min={0} value={s2} onChange={(e) => setS2(e.target.value)} className={FIELD} />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="rnotes" className="block text-[11px] text-white/55">Notes</label>
          <textarea id="rnotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="w-full border border-white/10 bg-black/30 px-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/30 transition-colors resize-none" />
        </div>
      </div>

      {report.isError && <InlineNotice tone="critical">{getApiErrorMessage(report.error, 'Could not submit result. Try again.')}</InlineNotice>}
      <div className="flex gap-3">
        <button onClick={onCancel} className={GHOST}>Cancel</button>
        <button onClick={submit} disabled={report.isPending || !s1 || !s2} className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-[13px] px-4 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
          {report.isPending ? 'Submitting…' : 'Submit result'}
        </button>
      </div>
    </div>
  );
}

// ── DisputeForm ───────────────────────────────────────────────────────────────

function DisputeForm({ sessionId, myTeamId, onCancel }: { sessionId: string; myTeamId: string | null; onCancel: () => void }) {
  const dispute = useOpenDispute(sessionId);
  const [reason, setReason] = useState('');

  async function submit() {
    if (!myTeamId || !reason.trim()) return;
    try { await dispute.mutateAsync({ raisedByTeamId: myTeamId, reason: reason.trim() }); }
    catch { /* shown via dispute.isError */ }
  }

  return (
    <div className="space-y-3">
      <p className={EYEBROW}>Raise Dispute</p>
      <div className="space-y-1">
        <label htmlFor="dreason" className="block text-[13px] text-white/70">Reason</label>
        <textarea id="dreason" rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} aria-required="true" placeholder="Describe the dispute…" className="w-full border border-white/10 bg-black/30 px-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/30 transition-colors resize-none" />
        <p className="text-[11px] text-white/25 text-right">{reason.length}/1000</p>
      </div>
      {dispute.isError && <InlineNotice tone="critical">{getApiErrorMessage(dispute.error, 'Could not raise dispute. Try again.')}</InlineNotice>}
      <div className="flex gap-3">
        <button onClick={onCancel} className={GHOST}>Cancel</button>
        <button onClick={submit} disabled={dispute.isPending || !reason.trim()} className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-[13px] px-4 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
          {dispute.isPending ? 'Submitting…' : 'Raise dispute'}
        </button>
      </div>
    </div>
  );
}

// ── ResultPanel ───────────────────────────────────────────────────────────────

function ResultPanel({ session, myTeamId, myTeamSide }: { session: ScrimSession; myTeamId: string | null; myTeamSide: 1 | 2 | null }) {
  const confirm = useConfirmScrimResult(session.id);
  const reduce = useReducedMotion();
  const [showReport, setShowReport] = useState(false);
  const [showDispute, setShowDispute] = useState(false);

  const t1Name = session.team1Name ?? 'Team 1';
  const t2Name = session.team2Name ?? 'Team 2';
  const opponentName = myTeamSide === 1 ? t2Name : t1Name;
  const myReported = (myTeamSide === 1 && session.resultReportedByTeam1) || (myTeamSide === 2 && session.resultReportedByTeam2);
  const oppReported = (myTeamSide === 1 && session.resultReportedByTeam2) || (myTeamSide === 2 && session.resultReportedByTeam1);
  const bothReported = session.resultReportedByTeam1 && session.resultReportedByTeam2;
  const score = session.team1Score != null && session.team2Score != null ? `${session.team1Score} – ${session.team2Score}` : null;
  const arrive = reduce ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18 } };

  if (session.status === 'disputed') {
    return (
      <div className={PANEL}>
        <p className={EYEBROW}>Result</p>
        <InlineNotice tone="warning">This session is disputed.</InlineNotice>
        <p className="text-[13px] text-white/45">Contact the organizer or admin to resolve.</p>
      </div>
    );
  }

  return (
    <div className={PANEL}>
      <p className={EYEBROW}>Result</p>

      {/* Sub-state D */}
      {bothReported && (
        <div className="space-y-3">
          {score && <p className="font-mono text-[24px] font-bold text-white tabular-nums">{score}</p>}
          <InlineNotice tone="success">Result confirmed.</InlineNotice>
        </div>
      )}

      {/* Sub-state C */}
      {!bothReported && oppReported && !myReported && (
        <div className="space-y-3">
          <InlineNotice tone="warning">{opponentName} reported a result.</InlineNotice>
          {score && <div className="space-y-1"><p className="text-[12px] text-white/40">Their report:</p><p className="font-mono text-[20px] text-white tabular-nums">{score}</p></div>}
          {confirm.isError && <p role="alert" className="text-[12px] text-red-300">{getApiErrorMessage(confirm.error, 'Could not confirm. Try again.')}</p>}
          {!showDispute && (
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => confirm.mutate()} disabled={confirm.isPending} className="border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 text-[13px] rounded-none px-4 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors">
                {confirm.isPending ? 'Confirming…' : 'Confirm result'}
              </button>
              <button onClick={() => setShowDispute(true)} className="text-amber-400/70 hover:text-amber-400 border border-amber-500/20 text-[13px] rounded-none px-4 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors">
                Raise dispute
              </button>
            </div>
          )}
          <AnimatePresence>
            {showDispute && (
              <motion.div key="df" className="border border-white/10 bg-black/30 p-4" {...arrive}>
                <DisputeForm sessionId={session.id} myTeamId={myTeamId} onCancel={() => setShowDispute(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Sub-state B */}
      {!bothReported && myReported && !oppReported && (
        <div className="space-y-3">
          {score && <div className="space-y-1"><p className="text-[13px] text-white/55">You reported:</p><p className="font-mono text-[20px] text-white tabular-nums">{score}</p></div>}
          <InlineNotice tone="neutral">Waiting for {opponentName} to confirm.</InlineNotice>
          {!showReport && <button onClick={() => setShowReport(true)} className={GHOST}>Edit result</button>}
          <AnimatePresence>
            {showReport && (
              <motion.div key="rf" {...arrive}>
                <ReportForm sessionId={session.id} gameSlug={session.gameSlug} myTeamId={myTeamId} t1Name={t1Name} t2Name={t2Name} defaultT1={String(session.team1Score ?? '')} defaultT2={String(session.team2Score ?? '')} onSuccess={() => setShowReport(false)} onCancel={() => setShowReport(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Sub-state A */}
      {!myReported && !oppReported && !bothReported && (
        <div className="space-y-3">
          <p className="text-[13px] text-white/40">Report the result when your session ends.</p>
          {!showReport && <button onClick={() => setShowReport(true)} className={GHOST}>Report result</button>}
          <AnimatePresence>
            {showReport && (
              <motion.div key="rf" {...arrive}>
                <ReportForm sessionId={session.id} gameSlug={session.gameSlug} myTeamId={myTeamId} t1Name={t1Name} t2Name={t2Name} defaultT1="" defaultT2="" onSuccess={() => setShowReport(false)} onCancel={() => setShowReport(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── ScrimSessionPage ──────────────────────────────────────────────────────────

export default function ScrimSessionPage() {
  const { id = '' } = useParams<{ id: string }>();
  const sessionQuery = useScrimSession(id);
  const teamsQuery = useMyTeamsSummary();
  const reduce = useReducedMotion();
  const session = sessionQuery.data;
  const myTeamIds = ((teamsQuery.data ?? []) as { id: string }[]).map((t) => t.id);
  const myTeamSide: 1 | 2 | null = session
    ? myTeamIds.includes(session.team1Id) ? 1 : myTeamIds.includes(session.team2Id) ? 2 : null
    : null;
  const myTeamId: string | null =
    myTeamSide === 1 ? (session?.team1Id ?? null) : myTeamSide === 2 ? (session?.team2Id ?? null) : null;
  // isCaptain: derived from the server-returned role — never trust the payload.
  // GetSessionAsync already restricts access to captain/manager, so myRole is always one of those
  // for valid responses. Non-captain team members will receive 404 from the session endpoint.
  const isCaptain = session?.myRole === 'captain' || session?.myRole === 'manager';

  function arrive(delay: number) {
    if (reduce) return {};
    return { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18, delay } };
  }

  if (sessionQuery.isLoading) {
    return <CompetitivePageShell><SessionSkeleton /></CompetitivePageShell>;
  }

  if (sessionQuery.isError || !session) {
    const denied = (sessionQuery.error as { status?: number } | null)?.status === 403
      || (sessionQuery.error as { status?: number } | null)?.status === 404;
    return (
      <CompetitivePageShell>
        <div className="px-4 lg:px-8 pt-8 pb-12 max-w-2xl space-y-4">
          <p className="text-[14px] text-white/55">
            {denied ? 'This session is not available. It may have been cancelled or you may not have access.' : 'Could not load this session. Check your connection and try again.'}
          </p>
          {denied
            ? <Link to="/competitive/scrims/workspace" className="text-[13px] text-white/55 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">← Back to Your Scrims</Link>
            : <button onClick={() => sessionQuery.refetch()} className="border border-white/[0.08] text-white/70 hover:text-white text-[13px] px-4 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">Retry</button>}
        </div>
      </CompetitivePageShell>
    );
  }

  if (!teamsQuery.isLoading && myTeamSide === null) {
    return (
      <CompetitivePageShell>
        <div className="px-4 lg:px-8 pt-8 pb-12 max-w-2xl space-y-4">
          <p className="text-[14px] text-white/55">You don&apos;t have access to this match room.</p>
          <Link to="/competitive/scrims/workspace" className="text-[13px] text-white/55 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">← Back to Your Scrims</Link>
        </div>
      </CompetitivePageShell>
    );
  }

  const cancelled = session.status === 'cancelled';

  return (
    <CompetitivePageShell>
      <div className="px-4 lg:px-8 pt-6 lg:pt-8 pb-10 lg:pb-12 max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/competitive/scrims/workspace" className="text-[12px] text-white/40 hover:text-white/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
            ← Your Scrims
          </Link>
          {sessionQuery.isFetching && !sessionQuery.isLoading && (
            <span className="text-[11px] text-white/30" aria-live="polite">Updating…</span>
          )}
        </div>

        <motion.div {...arrive(0)}>
          <FaceOffLockup session={session} myTeamSide={myTeamSide} />
        </motion.div>

        {/* Surface 4: Dispute banner — top of content, below face-off */}
        {session.dispute && (
          <motion.div {...arrive(0)}>
            <ScrimDisputeBanner
              dispute={session.dispute}
              callerTeamId={myTeamId ?? ''}
              sessionTeam1Id={session.team1Id}
              sessionId={session.id}
              isCaptain={isCaptain}
              onEvidenceSubmitted={() => sessionQuery.refetch()}
            />
          </motion.div>
        )}

        {cancelled && (
          <motion.div {...arrive(0.06)}>
            <InlineNotice tone="neutral">This session was cancelled.</InlineNotice>
          </motion.div>
        )}

        {/* Surface 1: Check-in panel */}
        {!cancelled && (
          <motion.div {...arrive(0.06)}>
            <ScrimCheckinPanel
              session={session}
              callerTeamId={myTeamId ?? ''}
              isCaptain={isCaptain}
              onCheckinSuccess={() => sessionQuery.refetch()}
            />
          </motion.div>
        )}

        {/* Surface 2: Veto section — between check-in and lobby */}
        {!cancelled && (
          <motion.div {...arrive(0.09)}>
            <ScrimVetoSection
              vetoSessionId={session.vetoSessionId ?? null}
              vetoMyToken={session.vetoMyToken ?? null}
              gameSlug={session.gameSlug}
              sessionStatus={session.status}
            />
          </motion.div>
        )}

        {(session.status === 'scheduled' || session.status === 'in_progress') && (
          <motion.div {...arrive(0.12)}>
            <LobbyInfoPanel session={session} />
          </motion.div>
        )}

        {(session.status === 'in_progress' || session.status === 'completed' || session.status === 'disputed') && (
          <motion.div {...arrive(0.18)}>
            <ResultPanel session={session} myTeamId={myTeamId} myTeamSide={myTeamSide} />
          </motion.div>
        )}
      </div>
    </CompetitivePageShell>
  );
}
