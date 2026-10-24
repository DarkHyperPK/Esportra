import { useNavigate } from 'react-router-dom';
import { PageIntro, InlineNotice, StatusPill } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { useMyTryoutInvites, useRespondToInvite } from '@/hooks/competitive/useTryouts';
import { useAuth } from '@/hooks/useAuth';
import type {
  TryoutInviteView,
  TryoutParticipantStatus,
  TryoutSessionStatus,
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

function InviteCard({ invite, userId }: { invite: TryoutInviteView; userId: string }) {
  const navigate = useNavigate();
  const respondMutation = useRespondToInvite(invite.sessionId, userId);
  const isPending = respondMutation.isPending;

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
            {invite.teamName ?? 'TEAM'}
          </p>
          <button
            className="text-[15px] font-semibold text-white hover:text-white/80 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            onClick={() => navigate(`/competitive/tryouts/sessions/${invite.sessionId}`)}
          >
            {invite.title}
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill
              label={invite.sessionStatus.replace('_', ' ').toUpperCase()}
              tone={SESSION_STATUS_TONE[invite.sessionStatus]}
            />
            <p className="text-[12px] text-white/40">{formatScheduled(invite.scheduledAt)}</p>
          </div>
        </div>
        <StatusPill
          label={invite.participantStatus.replace('_', ' ').toUpperCase()}
          tone={PARTICIPANT_STATUS_TONE[invite.participantStatus]}
        />
      </div>

      {invite.participantStatus === 'invited' && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => respondMutation.mutate('confirmed')}
            disabled={isPending}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[12px]"
          >
            {isPending ? '…' : 'Confirm'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => respondMutation.mutate('declined')}
            disabled={isPending}
            className="text-[12px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
          >
            {isPending ? '…' : 'Decline'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MyTryoutInvitesPage() {
  const { profile } = useAuth();
  const invitesQuery = useMyTryoutInvites();
  const invites = invitesQuery.data ?? [];
  const userId = profile?.id ?? '';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white w-full">
      <div className="px-4 pt-8 pb-4 lg:px-8">
        <PageIntro eyebrow="TRYOUTS" title="My Invites" />
      </div>

      <div className="px-4 lg:px-8 pb-8 space-y-4">
        {invitesQuery.isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-white/[0.04] border border-white/[0.06]" />
            ))}
          </div>
        ) : invitesQuery.isError ? (
          <div className="space-y-3">
            <InlineNotice tone="critical">Could not load invites. Try again.</InlineNotice>
            <Button
              variant="outline"
              onClick={() => invitesQuery.refetch()}
              className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
            >
              Retry
            </Button>
          </div>
        ) : invites.length === 0 ? (
          <p className="text-[14px] text-white/40 py-6">You have no tryout invites.</p>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <InviteCard key={invite.participantId} invite={invite} userId={userId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
