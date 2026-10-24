import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { PageIntro, InlineNotice, Field } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion, useReducedMotion } from 'framer-motion';
import {
  useTeamTryoutSessions,
  useCreateTryoutSession,
} from '@/hooks/competitive/useTryouts';
import { TryoutSessionCard } from '@/components/competitive/TryoutSessionCard';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { TryoutSessionStatus } from '@/types/competitive';

function formatScheduled(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function CreateSessionForm({
  teamId,
  onSuccess,
  onCancel,
}: {
  teamId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
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

const TAB_CLASS =
  'bg-transparent text-[13px] font-medium text-white/55 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-rose-500 rounded-none pb-1 h-full data-[state=active]:bg-transparent';

export default function TryoutWorkspacePage() {
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('team_id') ?? '';
  const [showCreateForm, setShowCreateForm] = useState(false);
  const reduced = useReducedMotion() ?? false;

  const sessionsQuery = useTeamTryoutSessions(teamId);
  const sessions = sessionsQuery.data ?? [];

  const upcoming = sessions.filter((s) => s.status === 'scheduled');
  const inProgress = sessions.filter((s) => s.status === 'in_progress');
  const completed = sessions.filter((s) => s.status === 'completed');
  const drafts = sessions.filter((s) => s.status === 'draft');

  if (!teamId) {
    return (
      <CompetitivePageShell>
        <div className="px-4 py-8">
          <InlineNotice tone="critical">No team ID provided. Add ?team_id= to the URL.</InlineNotice>
        </div>
      </CompetitivePageShell>
    );
  }

  return (
    <CompetitivePageShell>
      <div className="flex min-h-[100dvh]">
        {/* Left panel — desktop workspace divider */}
        <div className="hidden lg:flex flex-col w-[280px] shrink-0 border-r border-white/[0.06] px-5 pt-8 pb-6 gap-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
            TRYOUTS
          </p>
          <Button
            onClick={() => setShowCreateForm((v) => !v)}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[13px] w-full [box-shadow:0_0_12px_0_rgba(255,45,85,0.35)]"
          >
            {showCreateForm ? 'Cancel' : 'New Session'}
          </Button>
          <div className="space-y-2 border-t border-white/[0.06] pt-4">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-white/40">Upcoming</span>
              <span className="text-white/70 tabular-nums">{upcoming.length}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-white/40">In Progress</span>
              <span className="text-white/70 tabular-nums">{inProgress.length}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-white/40">Completed</span>
              <span className="text-white/70 tabular-nums">{completed.length}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-white/40">Draft</span>
              <span className="text-white/70 tabular-nums">{drafts.length}</span>
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 px-4 lg:px-8 pt-8 pb-8 space-y-4">
          {/* Mobile header */}
          <div className="flex items-start justify-between gap-4 lg:hidden">
            <PageIntro eyebrow="TRYOUT WORKSPACE" title="Tryout Sessions" />
            <Button
              onClick={() => setShowCreateForm((v) => !v)}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-none shrink-0 text-[13px]"
            >
              {showCreateForm ? 'Cancel' : 'New Session'}
            </Button>
          </div>
          <div className="hidden lg:block">
            <PageIntro eyebrow="TRYOUT WORKSPACE" title="Tryout Sessions" />
          </div>

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
                    <TabsTrigger key={value} value={value} className={TAB_CLASS}>
                      {label} <span className="ml-1 text-white/30">{count}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {(
                [
                  { value: 'upcoming', items: upcoming },
                  { value: 'in_progress', items: inProgress },
                  { value: 'completed', items: completed },
                  { value: 'draft', items: drafts },
                ] as const
              ).map(({ value, items }) => (
                <TabsContent key={value} value={value} className="mt-4 focus-visible:outline-none">
                  {items.length === 0 ? (
                    value === 'upcoming' && sessions.length === 0 ? (
                      <div className="py-16 flex flex-col items-center gap-4 text-center">
                        <ClipboardList className="h-8 w-8 text-white/25" />
                        <p className="text-[15px] font-medium text-white/55">No tryout sessions yet</p>
                        <p className="text-[13px] text-white/35 max-w-xs">
                          Create a session to start evaluating players.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(true)}
                          className="px-4 py-2 text-[13px] font-medium bg-rose-500 hover:bg-rose-600 text-white transition-colors [box-shadow:0_0_12px_0_rgba(255,45,85,0.35)]"
                        >
                          New session
                        </button>
                      </div>
                    ) : (
                      <p className="text-[14px] text-white/40 py-6">
                        No {value.replace('_', ' ')} sessions.
                      </p>
                    )
                  ) : (
                    <motion.div
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="space-y-2"
                    >
                      {items.map((s) => (
                        <TryoutSessionCard
                          key={s.id}
                          session={s}
                          isOwner
                        />
                      ))}
                    </motion.div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </div>
    </CompetitivePageShell>
  );
}
