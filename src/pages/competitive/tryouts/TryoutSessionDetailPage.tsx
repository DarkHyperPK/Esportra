import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InlineNotice, StatusPill } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EvaluationForm } from '@/components/competitive/tryouts/EvaluationForm';
import {
  useTryoutSession,
  useSessionParticipants,
  useSessionEvaluations,
  useInviteParticipant,
  useStartSession,
  useCompleteSession,
  useCancelSession,
} from '@/hooks/competitive/useTryouts';
import { getApiErrorMessage } from '@/lib/apiClient';
import type {
  TryoutSessionStatus,
  TryoutParticipantStatus,
  TryoutParticipant,
  TryoutEvaluation,
} from '@/types/competitive';

const SESSION_STATUS_TONE: Record<
  TryoutSessionStatus,
  'neutral' | 'accent' | 'success' | 'warning' | 'critical'
> = {
  draft: 'neutral',
  scheduled: 'accent',
  in_progress: 'critical',
  completed: 'success',
  cancelled: 'neutral',
};

const PARTICIPANT_STATUS_TONE: Record<
  TryoutParticipantStatus,
  'neutral' | 'accent' | 'success' | 'warning' | 'critical'
> = {
  invited: 'accent',
  confirmed: 'success',
  declined: 'neutral',
  attended: 'success',
  no_show: 'critical',
  removed: 'neutral',
};

function formatScheduled(iso: string | null): string {
  if (!iso) return 'No date set';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className="text-[11px] text-white/40 uppercase tracking-wide">{label}</p>
      <p className="text-[16px] font-semibold text-white tabular-nums">{value}<span className="text-[11px] text-white/30">/10</span></p>
    </div>
  );
}

function EvaluationRow({ evaluation }: { evaluation: TryoutEvaluation }) {
  const recColor =
    evaluation.recommendation === 'offer'
      ? 'text-green-400'
      : evaluation.recommendation === 'pass'
        ? 'text-red-300/70'
        : 'text-white/40';

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[14px] font-semibold text-white">
          {evaluation.evaluateeUsername ?? evaluation.evaluateeUserId}
        </p>
        <span className={`text-[12px] font-medium uppercase tracking-wide ${recColor}`}>
          {evaluation.recommendation}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        <ScoreCell label="Overall" value={evaluation.overallScore} />
        <ScoreCell label="Comm." value={evaluation.communication} />
        <ScoreCell label="Mech." value={evaluation.mechanics} />
        <ScoreCell label="Sense" value={evaluation.gameSense} />
        <ScoreCell label="Attitude" value={evaluation.attitude} />
        <ScoreCell label="Teamwork" value={evaluation.teamwork} />
        <ScoreCell label="Peak" value={evaluation.peakPlay} />
        <ScoreCell label="Consist." value={evaluation.consistency} />
      </div>
      {evaluation.notes && (
        <p className="text-[13px] text-white/55 border-t border-white/[0.06] pt-3">{evaluation.notes}</p>
      )}
    </div>
  );
}

function ParticipantRow({
  participant,
  onEvaluate,
}: {
  participant: TryoutParticipant;
  onEvaluate: (userId: string, username?: string) => void;
}) {
  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-3 flex items-center gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[14px] font-medium text-white truncate">
          {participant.username ?? participant.userId}
        </p>
        <StatusPill
          label={participant.status.replace('_', ' ').toUpperCase()}
          tone={PARTICIPANT_STATUS_TONE[participant.status]}
        />
      </div>
      {(participant.status === 'attended' || participant.status === 'confirmed') && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEvaluate(participant.userId, participant.username)}
          className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07] text-[12px] shrink-0"
        >
          Evaluate
        </Button>
      )}
    </div>
  );
}

function ParticipantsTab({ sessionId }: { sessionId: string }) {
  const participantsQuery = useSessionParticipants(sessionId);
  const inviteMutation = useInviteParticipant(sessionId);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [evaluatingUserId, setEvaluatingUserId] = useState<string | null>(null);
  const [evaluatingUsername, setEvaluatingUsername] = useState<string | undefined>(undefined);

  const participants = participantsQuery.data ?? [];

  function handleEvaluate(userId: string, username?: string) {
    setEvaluatingUserId(userId);
    setEvaluatingUsername(username);
  }

  async function handleInvite() {
    setInviteError('');
    if (!inviteUserId.trim()) return;
    try {
      await inviteMutation.mutateAsync({ userId: inviteUserId.trim() });
      setInviteUserId('');
    } catch (err) {
      setInviteError(getApiErrorMessage(err, 'Could not invite participant. Try again.'));
    }
  }

  if (participantsQuery.isLoading) {
    return (
      <div className="space-y-2 animate-pulse pt-4">
        {[1, 2].map((i) => <div key={i} className="h-14 bg-white/[0.04] border border-white/[0.06]" />)}
      </div>
    );
  }

  if (participantsQuery.isError) {
    return (
      <div className="pt-4 space-y-3">
        <p className="text-[14px] text-white/55">Could not load participants.</p>
        <Button
          variant="outline"
          onClick={() => participantsQuery.refetch()}
          className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1 min-w-0">
          <label htmlFor="invite-user" className="block text-[11px] font-medium text-white/40 mb-1 uppercase tracking-wide">
            Invite by User ID
          </label>
          <input
            id="invite-user"
            value={inviteUserId}
            onChange={(e) => setInviteUserId(e.target.value)}
            placeholder="User ID"
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </div>
        <Button
          onClick={handleInvite}
          disabled={inviteMutation.isPending || !inviteUserId.trim()}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[13px] h-10 shrink-0"
        >
          {inviteMutation.isPending ? '…' : 'Invite'}
        </Button>
      </div>
      {inviteError && <p role="alert" className="text-xs text-red-300">{inviteError}</p>}

      {evaluatingUserId && (
        <EvaluationForm
          sessionId={sessionId}
          evaluateeUserId={evaluatingUserId}
          evaluateeUsername={evaluatingUsername}
          onSuccess={() => setEvaluatingUserId(null)}
          onCancel={() => setEvaluatingUserId(null)}
        />
      )}

      {participants.length === 0 ? (
        <p className="text-[14px] text-white/40 py-6">No participants yet. Invite someone to get started.</p>
      ) : (
        <div className="space-y-2">
          {participants.map((p) => (
            <ParticipantRow key={p.id} participant={p} onEvaluate={handleEvaluate} />
          ))}
        </div>
      )}
    </div>
  );
}

function EvaluationsTab({ sessionId }: { sessionId: string }) {
  const evaluationsQuery = useSessionEvaluations(sessionId);

  if (evaluationsQuery.isLoading) {
    return (
      <div className="space-y-2 animate-pulse pt-4">
        {[1, 2].map((i) => <div key={i} className="h-20 bg-white/[0.04] border border-white/[0.06]" />)}
      </div>
    );
  }

  if (evaluationsQuery.isError) {
    const status = (evaluationsQuery.error as { status?: number } | null)?.status;
    if (status === 403) {
      return (
        <div className="pt-4">
          <InlineNotice tone="warning">You do not have permission to view evaluations for this session.</InlineNotice>
        </div>
      );
    }
    return (
      <div className="pt-4 space-y-3">
        <p className="text-[14px] text-white/55">Could not load evaluations.</p>
        <Button
          variant="outline"
          onClick={() => evaluationsQuery.refetch()}
          className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
        >
          Retry
        </Button>
      </div>
    );
  }

  const evaluations = evaluationsQuery.data ?? [];

  return (
    <div className="pt-4 space-y-3">
      {evaluations.length === 0 ? (
        <p className="text-[14px] text-white/40 py-6">No evaluations submitted yet.</p>
      ) : (
        evaluations.map((e) => <EvaluationRow key={e.id} evaluation={e} />)
      )}
    </div>
  );
}

export default function TryoutSessionDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const sessionQuery = useTryoutSession(id);
  const startMutation = useStartSession(id, sessionQuery.data?.teamId);
  const completeMutation = useCompleteSession(id, sessionQuery.data?.teamId);
  const cancelMutation = useCancelSession(id, sessionQuery.data?.teamId);

  const session = sessionQuery.data;
  const isActionPending = startMutation.isPending || completeMutation.isPending || cancelMutation.isPending;

  if (sessionQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-8 text-white animate-pulse space-y-4">
        <div className="h-6 w-48 bg-white/[0.06]" />
        <div className="h-10 w-64 bg-white/[0.06]" />
        <div className="h-4 w-32 bg-white/[0.04]" />
      </div>
    );
  }

  if (sessionQuery.isError || !session) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-8 text-white space-y-4">
        <InlineNotice tone="critical">Could not load session. It may not exist or you may not have access.</InlineNotice>
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
        >
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white w-full">
      <div className="px-4 pt-8 pb-4 lg:px-8 space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="text-[12px] text-white/40 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Go back"
        >
          ← Back
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
              {session.teamName ?? 'TRYOUT SESSION'}
            </p>
            <h1 className="text-[22px] font-bold text-white leading-tight">{session.title}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <StatusPill
                label={session.status.replace('_', ' ').toUpperCase()}
                tone={SESSION_STATUS_TONE[session.status]}
              />
              <p className="text-[13px] text-white/40">{formatScheduled(session.scheduledAt)}</p>
              {session.durationMinutes && (
                <p className="text-[13px] text-white/40">{session.durationMinutes} min</p>
              )}
              {session.participantCount != null && (
                <p className="text-[13px] text-white/40">{session.participantCount} participants</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0 flex-wrap">
            {session.status === 'scheduled' && (
              <Button
                size="sm"
                onClick={() => startMutation.mutate()}
                disabled={isActionPending}
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[13px]"
              >
                {startMutation.isPending ? '…' : 'Start session'}
              </Button>
            )}
            {session.status === 'in_progress' && (
              <Button
                size="sm"
                onClick={() => completeMutation.mutate()}
                disabled={isActionPending}
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[13px]"
              >
                {completeMutation.isPending ? '…' : 'Complete session'}
              </Button>
            )}
            {(session.status === 'draft' || session.status === 'scheduled' || session.status === 'in_progress') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => cancelMutation.mutate()}
                disabled={isActionPending}
                className="text-[13px] text-red-300/70 hover:text-red-300 rounded-none"
              >
                {cancelMutation.isPending ? '…' : 'Cancel session'}
              </Button>
            )}
          </div>
        </div>

        {session.description && (
          <p className="text-[13px] text-white/55 max-w-2xl">{session.description}</p>
        )}
      </div>

      <div className="px-4 lg:px-8 pb-8">
        <Tabs defaultValue="participants">
          <div className="border-b border-white/[0.08]">
            <TabsList className="bg-transparent p-0 h-10 gap-6">
              {(['participants', 'evaluations'] as const).map((value) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="bg-transparent text-[13px] font-medium text-white/55 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-rose-500 rounded-none pb-1 h-full data-[state=active]:bg-transparent capitalize"
                >
                  {value}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="participants" className="focus-visible:outline-none">
            <ParticipantsTab sessionId={id} />
          </TabsContent>
          <TabsContent value="evaluations" className="focus-visible:outline-none">
            <EvaluationsTab sessionId={id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
