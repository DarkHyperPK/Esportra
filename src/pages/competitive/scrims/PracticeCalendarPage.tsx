import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { PageIntro, InlineNotice, StatusPill, Field } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import {
  usePracticeSessions,
  useCreatePractice,
  useUpdatePractice,
  useCompletePractice,
  useCancelPractice,
  usePracticeAttendance,
  useUpsertAttendance,
  useUpdateOwnAttendance,
} from '@/hooks/competitive/useScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import type { PracticeSession, PracticeAttendance } from '@/types/competitive';

const SESSION_TONE = {
  scheduled: 'accent',
  completed: 'success',
  cancelled: 'neutral',
} as const;

const ATTENDANCE_TONE = {
  invited: 'neutral',
  confirmed: 'accent',
  attended: 'success',
  absent: 'critical',
  excused: 'warning',
} as const;

function formatDate(iso: string | null): string {
  if (!iso) return 'No date set';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// --- Create form ---

function CreatePracticeForm({
  teamId,
  onSuccess,
  onCancel,
}: {
  teamId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createMutation = useCreatePractice();
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState('');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    setTitleError('');
    if (!title.trim()) {
      setTitleError('Title is required.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        teamId,
        title: title.trim(),
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
    <div className="border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
        NEW PRACTICE SESSION
      </p>
      <Field label="Title" htmlFor="ps-title">
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
        <Field label="Duration (min)" htmlFor="ps-dur" optional>
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
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-5 text-[13px]"
        >
          {createMutation.isPending ? 'Creating…' : 'Create session'}
        </Button>
      </div>
    </div>
  );
}

// --- Attendance row ---

function AttendanceRow({
  entry,
  sessionId,
}: {
  entry: PracticeAttendance;
  sessionId: string;
}) {
  const ownMutation = useUpdateOwnAttendance(entry.id);
  const upsertMutation = useUpsertAttendance(sessionId);
  const isPending = ownMutation.isPending || upsertMutation.isPending;

  function markOwn(status: 'confirmed' | 'excused') {
    ownMutation.mutate(status);
  }

  function markBulk(status: 'attended' | 'absent') {
    upsertMutation.mutate([{ userId: entry.userId, status }]);
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] text-white truncate">{entry.username ?? entry.userId.slice(0, 8)}</p>
          <StatusPill label={entry.status.toUpperCase()} tone={ATTENDANCE_TONE[entry.status]} />
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {entry.status === 'invited' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => markOwn('confirmed')}
            disabled={isPending}
            className="text-[11px] text-white/55 hover:text-white rounded-none border border-white/[0.08] h-7 px-2"
          >
            Confirm
          </Button>
        )}
        {(entry.status === 'invited' || entry.status === 'confirmed') && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => markOwn('excused')}
            disabled={isPending}
            className="text-[11px] text-white/55 hover:text-white rounded-none border border-white/[0.08] h-7 px-2"
          >
            Excuse
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => markBulk('attended')}
          disabled={isPending}
          className="text-[11px] text-white/55 hover:text-white rounded-none border border-white/[0.08] h-7 px-2"
        >
          Attended
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => markBulk('absent')}
          disabled={isPending}
          className="text-[11px] text-red-300/60 hover:text-red-300 rounded-none h-7 px-2"
        >
          Absent
        </Button>
      </div>
    </div>
  );
}

// --- Edit session form ---

function EditSessionForm({
  session,
  onClose,
}: {
  session: PracticeSession;
  onClose: () => void;
}) {
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
      <Field label="Title" htmlFor={`est-${session.id}`}>
        <input
          id={`est-${session.id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date & time" htmlFor={`esat-${session.id}`} optional>
          <input
            id={`esat-${session.id}`}
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
          />
        </Field>
        <Field label="Duration (min)" htmlFor={`esdm-${session.id}`} optional>
          <input
            id={`esdm-${session.id}`}
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
      <Field label="Notes" htmlFor={`esn-${session.id}`} optional>
        <textarea
          id={`esn-${session.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          rows={2}
          className="w-full border border-white/10 bg-black/30 px-3 py-2 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
        />
      </Field>
      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}
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
          disabled={updateMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-4 text-[13px]"
        >
          {updateMutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

// --- Session panel (inline attendance) ---

function SessionPanel({ session }: { session: PracticeSession }) {
  const completeMutation = useCompletePractice(session.id);
  const cancelMutation = useCancelPractice(session.id);
  const attendanceQuery = usePracticeAttendance(session.id);
  const attendance = attendanceQuery.data ?? [];
  const isPending = completeMutation.isPending || cancelMutation.isPending;
  const [showEdit, setShowEdit] = useState(false);

  return (
    <div className="border-t border-white/[0.06] mt-2 pt-3 space-y-3">
      <div className="flex gap-2 flex-wrap">
        {session.status === 'scheduled' && (
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
              onClick={() => setShowEdit((v) => !v)}
              className="text-[12px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => cancelMutation.mutate()}
              disabled={isPending}
              className="text-[12px] text-red-300/70 hover:text-red-300 rounded-none"
            >
              {cancelMutation.isPending ? '…' : 'Cancel session'}
            </Button>
          </>
        )}
      </div>
      {showEdit && (
        <EditSessionForm session={session} onClose={() => setShowEdit(false)} />
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
  );
}

// --- Session row ---

function PracticeSessionRow({ session }: { session: PracticeSession }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4">
      <button
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${session.title}`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-semibold text-white">{session.title}</p>
          <StatusPill label={session.status.toUpperCase()} tone={SESSION_TONE[session.status]} />
        </div>
        <p className="text-[12px] text-white/40 mt-0.5">
          {formatDate(session.scheduledAt)}
          {session.durationMinutes ? ` · ${session.durationMinutes}m` : ''}
        </p>
        {session.notes && (
          <p className="text-[13px] text-white/45 mt-1 line-clamp-1">{session.notes}</p>
        )}
      </button>
      {expanded && <SessionPanel session={session} />}
    </div>
  );
}

// --- Main page ---

export default function PracticeCalendarPage() {
  const [searchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);

  const teamsQuery = useMyTeamsSummary();
  const teams = (teamsQuery.data ?? []) as { id: string; name: string }[];
  const teamId = searchParams.get('team_id') ?? teams[0]?.id ?? '';

  const sessionsQuery = usePracticeSessions(teamId);
  const sessions = sessionsQuery.data ?? [];
  const scheduled = sessions.filter((s) => s.status === 'scheduled');
  const past = sessions.filter((s) => s.status !== 'scheduled');

  if (teamsQuery.isLoading) {
    return (
      <CompetitivePageShell>
        <div className="px-4 py-8 space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-white/[0.06]" />
          <div className="h-4 w-64 bg-white/[0.04]" />
        </div>
      </CompetitivePageShell>
    );
  }

  if (!teamsQuery.isLoading && !teamId) {
    return (
      <CompetitivePageShell>
        <div className="px-4 py-8">
          <InlineNotice tone="neutral">You need to be on a team to use Practice Sessions.</InlineNotice>
        </div>
      </CompetitivePageShell>
    );
  }

  return (
    <CompetitivePageShell>
      <div className="px-4 pt-8 pb-4 lg:px-8 flex items-start justify-between gap-4">
        <PageIntro eyebrow="PRACTICE" title="Practice Sessions" />
        <Button
          onClick={() => setShowCreate((v) => !v)}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none shrink-0 text-[13px]"
        >
          {showCreate ? 'Cancel' : 'New Session'}
        </Button>
      </div>

      <div className="px-4 lg:px-8 pb-8 space-y-6">
        {showCreate && (
          <CreatePracticeForm
            teamId={teamId}
            onSuccess={() => setShowCreate(false)}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {sessionsQuery.isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/[0.04] border border-white/[0.06]" />
            ))}
          </div>
        ) : sessionsQuery.isError ? (
          <div className="space-y-3">
            <p className="text-[14px] text-white/55">Could not load sessions. Try again.</p>
            <Button
              variant="outline"
              onClick={() => sessionsQuery.refetch()}
              className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35 mb-3">
                UPCOMING ({scheduled.length})
              </p>
              {scheduled.length === 0 ? (
                <p className="text-[14px] text-white/40 py-4">No upcoming sessions.</p>
              ) : (
                <div className="space-y-2">
                  {scheduled.map((s) => <PracticeSessionRow key={s.id} session={s} />)}
                </div>
              )}
            </div>
            {past.length > 0 && (
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35 mb-3">
                  PAST ({past.length})
                </p>
                <div className="space-y-2">
                  {past.map((s) => <PracticeSessionRow key={s.id} session={s} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </CompetitivePageShell>
  );
}
