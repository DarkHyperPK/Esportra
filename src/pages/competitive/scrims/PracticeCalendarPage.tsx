import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { PageIntro, InlineNotice, StatusPill, Field } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import {
  useCreatePractice,
  useUpdatePractice,
  useCompletePractice,
  useCancelPractice,
  usePracticeAttendance,
  useUpsertAttendance,
  useUpdateOwnAttendance,
} from '@/hooks/competitive/useScrims';
import { usePracticeAndScrims } from '@/hooks/competitive/usePracticeAndScrims';
import type { TimelineItem } from '@/hooks/competitive/usePracticeAndScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import type { PracticeSession, PracticeAttendance } from '@/types/competitive';

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSION_TONE = {
  scheduled: 'accent',
  completed: 'success',
  cancelled: 'neutral',
} as const;

const SCRIM_TONE = {
  scheduled: 'accent',
  in_progress: 'accent',
  completed: 'success',
  cancelled: 'neutral',
  disputed: 'warning',
} as const;

const ATTENDANCE_TONE = {
  invited: 'neutral',
  confirmed: 'accent',
  attended: 'success',
  absent: 'critical',
  excused: 'warning',
} as const;

const PAST_COLLAPSE_THRESHOLD = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null): string {
  if (!iso) return 'No date set';
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  return `${minutes}-min block`;
}

const GAME_ABBREV: Record<string, string> = {
  valorant: 'VAL',
  cs2: 'CS2',
  r6s: 'R6S',
  apex: 'APEX',
  overwatch2: 'OW2',
  dota2: 'DOTA',
  lol: 'LOL',
};

function gameLabel(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return GAME_ABBREV[slug.toLowerCase()] ?? slug.toUpperCase().slice(0, 4);
}

// ── Chip components ───────────────────────────────────────────────────────────

function PracticeChip() {
  return (
    <span className="font-mono text-[9px] tracking-[0.2em] bg-white/[0.05] text-white/35 px-1.5 py-0.5">
      PRACTICE
    </span>
  );
}

function ScrimChip() {
  return (
    <span className="font-mono text-[9px] tracking-[0.2em] bg-rose-500/[0.12] text-rose-400/70 px-1.5 py-0.5">
      SCRIM
    </span>
  );
}

function GameChip({ slug }: { slug: string | null | undefined }) {
  const label = gameLabel(slug);
  if (!label) return null;
  return (
    <span className="font-mono text-[9px] tracking-[0.2em] text-white/30 px-1.5 py-0.5">
      {label}
    </span>
  );
}

// ── Expand animation ──────────────────────────────────────────────────────────

const expandVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto' },
};

// ── Create practice form ──────────────────────────────────────────────────────

function CreatePracticeForm({
  teamId,
  defaultGameSlug,
  onSuccess,
  onCancel,
}: {
  teamId: string;
  defaultGameSlug?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createMutation = useCreatePractice();
  const { games } = useGameCatalogContext();
  const [gameSlug, setGameSlug] = useState(defaultGameSlug ?? (games[0]?.slug ?? ''));
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [gameError, setGameError] = useState('');
  const [titleError, setTitleError] = useState('');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    setGameError('');
    setTitleError('');
    if (!gameSlug) { setGameError('Game is required.'); return; }
    if (!title.trim()) { setTitleError('Session title is required.'); return; }
    try {
      await createMutation.mutateAsync({
        teamId,
        title: title.trim(),
        gameSlug,
        scheduledAt: scheduledAt || undefined,
        durationMinutes: duration ? parseInt(duration, 10) : undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not create session. Try again.'));
    }
  }

  return (
    <div className="border border-white/10 bg-white/[0.03] p-4 space-y-3 mb-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
        NEW PRACTICE SESSION
      </p>
      <Field label="Game" htmlFor="ps-game">
        <select
          id="ps-game"
          value={gameSlug}
          onChange={(e) => setGameSlug(e.target.value)}
          className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
        >
          <option value="" disabled>Select game</option>
          {games.map((g) => (
            <option key={g.slug} value={g.slug}>{g.name}</option>
          ))}
        </select>
        {gameError && <p role="alert" className="text-xs text-red-300 mt-1">{gameError}</p>}
      </Field>
      <Field label="Session title" htmlFor="ps-title">
        <input
          id="ps-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Wednesday Scrim Prep"
          className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
        />
        {titleError && <p role="alert" className="text-xs text-red-300 mt-1">{titleError}</p>}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date & time" htmlFor="ps-at" optional>
          <input
            id="ps-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
          />
        </Field>
        <Field label="Block length (min)" htmlFor="ps-dur" optional>
          <input
            id="ps-dur"
            type="number"
            min={15}
            max={480}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 90"
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
      </div>
      <Field label="Notes" htmlFor="ps-notes" optional>
        <textarea
          id="ps-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          placeholder="Focus areas, agenda…"
          rows={2}
          className="w-full border border-white/10 bg-black/30 px-3 py-2 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
        />
      </Field>
      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-[13px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
        >
          Cancel
        </Button>
        <Button
          onClick={() => { void handleSubmit(); }}
          disabled={createMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-5 text-[13px]"
        >
          {createMutation.isPending ? 'Creating…' : 'Create session'}
        </Button>
      </div>
    </div>
  );
}

// ── Attendance row ────────────────────────────────────────────────────────────

function AttendanceRow({ entry, sessionId }: { entry: PracticeAttendance; sessionId: string }) {
  const ownMutation = useUpdateOwnAttendance(entry.id);
  const upsertMutation = useUpsertAttendance(sessionId);
  const isPending = ownMutation.isPending || upsertMutation.isPending;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] text-white truncate">{entry.username ?? entry.userId.slice(0, 8)}</p>
          <StatusPill label={entry.status.toUpperCase()} tone={ATTENDANCE_TONE[entry.status]} />
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
        {entry.status === 'invited' && (
          <Button size="sm" variant="ghost" disabled={isPending}
            onClick={() => ownMutation.mutate('confirmed')}
            className="text-[11px] text-white/55 hover:text-white rounded-none border border-white/[0.08] h-7 px-2">
            Confirm
          </Button>
        )}
        {(entry.status === 'invited' || entry.status === 'confirmed') && (
          <Button size="sm" variant="ghost" disabled={isPending}
            onClick={() => ownMutation.mutate('excused')}
            className="text-[11px] text-white/55 hover:text-white rounded-none border border-white/[0.08] h-7 px-2">
            Excuse
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={isPending}
          onClick={() => upsertMutation.mutate([{ userId: entry.userId, status: 'attended' }])}
          className="text-[11px] text-white/55 hover:text-white rounded-none border border-white/[0.08] h-7 px-2">
          Attended
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending}
          onClick={() => upsertMutation.mutate([{ userId: entry.userId, status: 'absent' }])}
          className="text-[11px] text-red-300/60 hover:text-red-300 rounded-none h-7 px-2">
          Absent
        </Button>
      </div>
    </div>
  );
}

// ── Edit session form ─────────────────────────────────────────────────────────

function EditSessionForm({ session, onClose }: { session: PracticeSession; onClose: () => void }) {
  const updateMutation = useUpdatePractice(session.id);
  const [title, setTitle] = useState(session.title);
  const [scheduledAt, setScheduledAt] = useState(
    session.scheduledAt ? new Date(session.scheduledAt).toISOString().slice(0, 16) : ''
  );
  const [duration, setDuration] = useState(session.durationMinutes?.toString() ?? '');
  const [notes, setNotes] = useState(session.notes ?? '');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    try {
      await updateMutation.mutateAsync({
        title: title.trim() || undefined,
        scheduledAt: scheduledAt || undefined,
        durationMinutes: duration ? parseInt(duration, 10) : undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not update session. Try again.'));
    }
  }

  return (
    <div className="border border-white/10 bg-black/30 p-3 space-y-3 mt-2">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
        EDIT SESSION
      </p>
      <Field label="Session title" htmlFor={`est-${session.id}`}>
        <input id={`est-${session.id}`} value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white focus:outline-none focus:border-white/30" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date & time" htmlFor={`esat-${session.id}`} optional>
          <input id={`esat-${session.id}`} type="datetime-local" value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white focus:outline-none focus:border-white/30 [color-scheme:dark]" />
        </Field>
        <Field label="Block length (min)" htmlFor={`esdm-${session.id}`} optional>
          <input id={`esdm-${session.id}`} type="number" min={15} max={480} value={duration}
            onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 90"
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30" />
        </Field>
      </div>
      <Field label="Notes" htmlFor={`esn-${session.id}`} optional>
        <textarea id={`esn-${session.id}`} value={notes} rows={2}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          className="w-full border border-white/10 bg-black/30 px-3 py-2 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none" />
      </Field>
      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}
          className="text-[13px] text-white/55 hover:text-white rounded-none border border-white/[0.08]">
          Cancel
        </Button>
        <Button onClick={() => { void handleSubmit(); }} disabled={updateMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-4 text-[13px]">
          {updateMutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

// ── Practice session card ─────────────────────────────────────────────────────

function PracticeSessionCard({ session }: { session: PracticeSession }) {
  const [expanded, setExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const completeMutation = useCompletePractice(session.id);
  const cancelMutation = useCancelPractice(session.id);
  const attendanceQuery = usePracticeAttendance(session.id);
  const shouldReduceMotion = useReducedMotion();
  const attendance = attendanceQuery.data ?? [];
  const isPending = completeMutation.isPending || cancelMutation.isPending;

  const dateStr = formatDateTime(session.scheduledAt);
  const durationStr = formatDuration(session.durationMinutes);
  const confirmedCount = attendance.filter(
    (a) => a.status === 'confirmed' || a.status === 'attended'
  ).length;

  const panelTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: 'easeOut' };

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4">
      <button
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${session.title}`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <PracticeChip />
          <GameChip slug={session.gameSlug} />
          <StatusPill label={session.status.toUpperCase()} tone={SESSION_TONE[session.status]} />
        </div>
        <p className="text-[14px] font-semibold text-white mt-1">{session.title}</p>
        <p className="text-[12px] text-white/45 mt-0.5">
          {dateStr}
          {durationStr ? ` · ${durationStr}` : ''}
          {attendance.length > 0 ? ` · ${confirmedCount}/${attendance.length} attending` : ''}
        </p>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="panel"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={expandVariants}
            transition={panelTransition}
            style={{ overflow: 'hidden' }}
          >
            <div className="border-t border-white/[0.06] mt-2 pt-3 space-y-3">
              {session.status === 'scheduled' && (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={() => completeMutation.mutate()} disabled={isPending}
                    className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[12px]">
                    {completeMutation.isPending ? '…' : 'Complete'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowEdit((v) => !v)}
                    className="text-[12px] text-white/55 hover:text-white rounded-none border border-white/[0.08]">
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => cancelMutation.mutate()}
                    disabled={isPending}
                    className="text-[12px] text-red-300/70 hover:text-red-300 rounded-none">
                    {cancelMutation.isPending ? '…' : 'Cancel session'}
                  </Button>
                </div>
              )}
              {showEdit && (
                <EditSessionForm session={session} onClose={() => setShowEdit(false)} />
              )}
              {session.notes && (
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30 mb-1">
                    NOTES
                  </p>
                  <p className="text-[13px] text-white/55 leading-relaxed">{session.notes}</p>
                </div>
              )}
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30 mb-2">
                  ATTENDANCE ({attendance.length})
                </p>
                {attendanceQuery.isLoading ? (
                  <div className="h-8 bg-white/[0.03] animate-pulse" />
                ) : attendance.length === 0 ? (
                  <p className="text-[13px] text-white/35">No attendees yet.</p>
                ) : (
                  <div>
                    {attendance.map((entry) => (
                      <AttendanceRow key={entry.id} entry={entry} sessionId={session.id} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Scrim session card ────────────────────────────────────────────────────────

function ScrimSessionCard({ session, teamId }: { session: import('@/types/competitive').ScrimSession; teamId: string }) {
  const isTeam1 = session.team1Id === teamId;
  const opponentName = isTeam1
    ? (session.team2Name ?? 'Unknown team')
    : (session.team1Name ?? 'Unknown team');
  const myScore = isTeam1 ? session.team1Score : session.team2Score;
  const theirScore = isTeam1 ? session.team2Score : session.team1Score;
  const hasScore = myScore !== null && theirScore !== null;
  const isUpcoming = session.status === 'scheduled' || session.status === 'in_progress';
  const tone = SCRIM_TONE[session.status] ?? 'neutral';

  const dateStr = formatDateTime(session.scheduledAt);
  const durationStr = formatDuration(session.durationMinutes);

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <ScrimChip />
        <GameChip slug={session.gameSlug} />
        <StatusPill label={session.status.toUpperCase().replace('_', ' ')} tone={tone} />
      </div>
      <p className="text-[14px] font-semibold text-white mt-1">vs {opponentName}</p>
      <p className="text-[12px] text-white/45 mt-0.5">
        {dateStr}
        {durationStr ? ` · ${durationStr}` : ''}
        {hasScore && (
          <span className="text-white/60 font-mono">
            {' '}· {myScore}–{theirScore}
          </span>
        )}
      </p>
      {isUpcoming && (
        <div className="mt-2">
          <Link
            to={`/competitive/scrims/sessions/${session.id}`}
            className="inline-flex items-center text-[12px] text-white/50 hover:text-white border border-white/[0.08] px-2.5 py-1 transition-colors"
          >
            Open room
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Timeline section ──────────────────────────────────────────────────────────

function TimelineSection({
  label,
  items,
  teamId,
}: {
  label: string;
  items: TimelineItem[];
  teamId: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.28em] text-zinc-500 mb-3">
        {label} <span className="opacity-60">({items.length})</span>
      </p>
      <div className="space-y-2">
        {items.map((item) =>
          item.type === 'practice' ? (
            <PracticeSessionCard key={item.id} session={item.session} />
          ) : (
            <ScrimSessionCard key={item.id} session={item.session} teamId={teamId} />
          )
        )}
      </div>
    </div>
  );
}

// ── Past section ──────────────────────────────────────────────────────────────

function PastSection({ items, teamId }: { items: TimelineItem[]; teamId: string }) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = items.length > PAST_COLLAPSE_THRESHOLD;
  const shouldReduceMotion = useReducedMotion();

  if (items.length === 0) return null;

  const pastTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: 'easeOut' };

  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.28em] text-zinc-500 mb-3">
        PAST <span className="opacity-60">({items.length})</span>
      </p>
      {shouldCollapse && !expanded ? (
        <Button
          variant="ghost"
          onClick={() => setExpanded(true)}
          className="text-[13px] text-white/45 hover:text-white rounded-none border border-white/[0.08] w-full"
        >
          Show {items.length} past sessions
        </Button>
      ) : (
        <AnimatePresence initial={false}>
          <motion.div
            key="past-list"
            initial={shouldCollapse ? 'hidden' : 'visible'}
            animate="visible"
            variants={expandVariants}
            transition={pastTransition}
            style={{ overflow: 'hidden' }}
          >
            <div className="space-y-2">
              {items.map((item) =>
                item.type === 'practice' ? (
                  <PracticeSessionCard key={item.id} session={item.session} />
                ) : (
                  <ScrimSessionCard key={item.id} session={item.session} teamId={teamId} />
                )
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PracticeCalendarPage() {
  const [searchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);

  const teamsQuery = useMyTeamsSummary();
  const teams = (teamsQuery.data ?? []) as { id: string; name: string; gameSlug?: string | null }[];
  const teamId = searchParams.get('team_id') ?? teams[0]?.id ?? '';
  const primaryGameSlug = teams[0]?.gameSlug ?? null;

  const shouldReduceMotion = useReducedMotion();
  const formTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' };

  const { grouped, isLoading, isError, isEmpty, refetch } = usePracticeAndScrims(teamId);
  const hasUpcoming =
    grouped.thisWeek.length > 0 || grouped.nextWeek.length > 0 || grouped.later.length > 0;

  if (teamsQuery.isLoading) {
    return (
      <CompetitivePageShell>
        <div className="px-4 lg:px-8 py-8 space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-white/[0.06]" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/[0.04] border border-white/[0.06]" />
            ))}
          </div>
        </div>
      </CompetitivePageShell>
    );
  }

  if (!teamId) {
    return (
      <CompetitivePageShell>
        <div className="px-4 lg:px-8 py-8">
          <InlineNotice tone="neutral">
            You need to be on a team to use Practice sessions.
          </InlineNotice>
        </div>
      </CompetitivePageShell>
    );
  }

  return (
    <CompetitivePageShell>
      <div className="px-4 pt-6 pb-8 lg:px-8 lg:pt-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <PageIntro eyebrow="PRACTICE" title="Practice & Scrims" />
          <Button
            onClick={() => setShowCreate((v) => !v)}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-none shrink-0 text-[13px]"
          >
            New session
          </Button>
        </div>

        {/* Create form */}
        <AnimatePresence initial={false}>
          {showCreate && (
            <motion.div
              key="create-form"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={expandVariants}
              transition={formTransition}
              style={{ overflow: 'hidden' }}
            >
              <CreatePracticeForm
                teamId={teamId}
                defaultGameSlug={primaryGameSlug}
                onSuccess={() => setShowCreate(false)}
                onCancel={() => setShowCreate(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/[0.04] border border-white/[0.06]" />
            ))}
          </div>
        ) : isError ? (
          <div className="space-y-3">
            <p className="text-[14px] text-white/55">Could not load sessions. Try again.</p>
            <Button
              variant="outline"
              onClick={refetch}
              className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
            >
              Retry
            </Button>
          </div>
        ) : isEmpty ? (
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            <Calendar className="h-8 w-8 text-white/20" />
            <div className="space-y-1">
              <p className="text-[15px] font-medium text-white/50">No sessions scheduled.</p>
              <p className="text-[13px] text-white/35 max-w-xs">
                Add a practice session to start tracking your team&apos;s schedule.
              </p>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[13px]"
            >
              New session
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {!hasUpcoming && (
              <p className="text-[14px] text-white/40 py-4">No sessions this week.</p>
            )}
            <TimelineSection label="THIS WEEK" items={grouped.thisWeek} teamId={teamId} />
            <TimelineSection label="NEXT WEEK" items={grouped.nextWeek} teamId={teamId} />
            <TimelineSection label="LATER" items={grouped.later} teamId={teamId} />
            <PastSection items={grouped.past} teamId={teamId} />
          </div>
        )}
      </div>
    </CompetitivePageShell>
  );
}
