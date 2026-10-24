import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageIntro, InlineNotice, StatusPill } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Field } from '@/components/ui/kit';
import {
  useTeamTryoutSessions,
  useCreateTryoutSession,
  useStartSession,
  useCompleteSession,
  useCancelSession,
} from '@/hooks/competitive/useTryouts';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { TryoutSession, TryoutSessionStatus } from '@/types/competitive';

const STATUS_TONE: Record<
  TryoutSessionStatus,
  'neutral' | 'accent' | 'success' | 'warning' | 'critical'
> = {
  draft: 'neutral',
  scheduled: 'accent',
  in_progress: 'critical',
  completed: 'success',
  cancelled: 'neutral',
};

function formatScheduled(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function SessionRow({ session, teamId }: { session: TryoutSession; teamId: string }) {
  const navigate = useNavigate();
  const startMutation = useStartSession(session.id, teamId);
  const completeMutation = useCompleteSession(session.id, teamId);
  const cancelMutation = useCancelSession(session.id, teamId);
  const isPending = startMutation.isPending || completeMutation.isPending || cancelMutation.isPending;

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 flex items-center gap-3">
      <button
        className="min-w-0 flex-1 space-y-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        onClick={() => navigate(`/competitive/tryouts/sessions/${session.id}`)}
        aria-label={`Open session ${session.title}`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-semibold text-white truncate">{session.title}</p>
          <StatusPill
            label={session.status.replace('_', ' ').toUpperCase()}
            tone={STATUS_TONE[session.status]}
          />
        </div>
        <p className="text-[12px] text-white/40">
          {formatScheduled(session.scheduledAt)}
          {session.participantCount != null ? ` · ${session.participantCount} participants` : ''}
        </p>
      </button>

      <div className="flex gap-2 shrink-0 flex-wrap justify-end">
        {session.status === 'scheduled' && (
          <Button
            size="sm"
            onClick={() => startMutation.mutate()}
            disabled={isPending}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[12px]"
          >
            {startMutation.isPending ? '…' : 'Start'}
          </Button>
        )}
        {session.status === 'in_progress' && (
          <Button
            size="sm"
            onClick={() => completeMutation.mutate()}
            disabled={isPending}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[12px]"
          >
            {completeMutation.isPending ? '…' : 'Complete'}
          </Button>
        )}
        {(session.status === 'draft' || session.status === 'scheduled' || session.status === 'in_progress') && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => cancelMutation.mutate()}
            disabled={isPending}
            className="text-[12px] text-red-300/70 hover:text-red-300 rounded-none"
          >
            {cancelMutation.isPending ? '…' : 'Cancel'}
          </Button>
        )}
      </div>
    </div>
  );
}

function CreateSessionForm({ teamId, onSuccess, onCancel }: { teamId: string; onSuccess: () => void; onCancel: () => void }) {
  const createMutation = useCreateTryoutSession();
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [description, setDescription] = useState('');
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
        maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : undefined,
        description: description.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not create session. Try again.'));
    }
  }

  return (
    <div className="border border-white/10 bg-white/[0.03] p-4 space-y-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
        NEW TRYOUT SESSION
      </p>

      <Field label="Title" htmlFor="session-title">
        <input
          id="session-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Duelist Tryout — October"
          className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
        />
        {titleError && <p role="alert" className="text-xs text-red-300 mt-1">{titleError}</p>}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Scheduled at" htmlFor="session-scheduled" optional>
          <input
            id="session-scheduled"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
          />
        </Field>
        <Field label="Max participants" htmlFor="session-max" optional>
          <input
            id="session-max"
            type="number"
            min={1}
            max={100}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            placeholder="e.g. 10"
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
      </div>

      <Field label="Description" htmlFor="session-desc" optional>
        <textarea
          id="session-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          placeholder="What roles or requirements are you looking for?"
          rows={3}
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

export default function TryoutWorkspacePage() {
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('team_id') ?? '';
  const [showCreateForm, setShowCreateForm] = useState(false);

  const sessionsQuery = useTeamTryoutSessions(teamId);
  const sessions = sessionsQuery.data ?? [];

  const upcoming = sessions.filter((s) => s.status === 'scheduled');
  const inProgress = sessions.filter((s) => s.status === 'in_progress');
  const completed = sessions.filter((s) => s.status === 'completed');
  const drafts = sessions.filter((s) => s.status === 'draft');

  if (!teamId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-8 text-white">
        <InlineNotice tone="critical">No team ID provided. Add ?team_id= to the URL.</InlineNotice>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white w-full">
      <div className="px-4 pt-8 pb-4 lg:px-8 flex items-start justify-between gap-4">
        <PageIntro eyebrow="TRYOUT WORKSPACE" title="Tryout Sessions" />
        <Button
          onClick={() => setShowCreateForm((v) => !v)}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none shrink-0 text-[13px]"
        >
          {showCreateForm ? 'Cancel' : 'New Session'}
        </Button>
      </div>

      <div className="px-4 lg:px-8 pb-8 space-y-4">
        {showCreateForm && (
          <CreateSessionForm
            teamId={teamId}
            onSuccess={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {sessionsQuery.isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2].map((i) => (
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
          <Tabs defaultValue="upcoming">
            <div className="border-b border-white/[0.08]">
              <TabsList className="bg-transparent p-0 h-10 gap-6">
                {(
                  [
                    { value: 'upcoming', label: 'Upcoming', count: upcoming.length },
                    { value: 'in_progress', label: 'In Progress', count: inProgress.length },
                    { value: 'completed', label: 'Completed', count: completed.length },
                    { value: 'draft', label: 'Draft', count: drafts.length },
                  ] as const
                ).map(({ value, label, count }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="bg-transparent text-[13px] font-medium text-white/55 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-rose-500 rounded-none pb-1 h-full data-[state=active]:bg-transparent"
                  >
                    {label} <span className="ml-1 text-white/30">{count}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {(
              [
                { value: 'upcoming', items: upcoming, empty: 'No upcoming sessions.' },
                { value: 'in_progress', items: inProgress, empty: 'No sessions in progress.' },
                { value: 'completed', items: completed, empty: 'No completed sessions.' },
                { value: 'draft', items: drafts, empty: 'No draft sessions.' },
              ] as const
            ).map(({ value, items, empty }) => (
              <TabsContent key={value} value={value} className="mt-4 focus-visible:outline-none">
                {items.length === 0 ? (
                  <p className="text-[14px] text-white/40 py-6">{empty}</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((s) => (
                      <SessionRow key={s.id} session={s} teamId={teamId} />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
