import { Inbox } from 'lucide-react';
import { PageIntro, InlineNotice } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { motion, useReducedMotion } from 'framer-motion';
import { useMyTryoutInvites, useRespondToInvite } from '@/hooks/competitive/useTryouts';
import { TryoutSessionCard } from '@/components/competitive/TryoutSessionCard';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { useAuth } from '@/hooks/useAuth';
import type { TryoutInviteView, TryoutSession } from '@/types/competitive';

// ─── Adapter: shape a TryoutInviteView as a TryoutSession for the shared card ──

function inviteToSession(invite: TryoutInviteView): TryoutSession {
  return {
    id: invite.sessionId,
    teamId: '',
    gameSlug: invite.gameSlug,
    title: invite.title,
    description: null,
    scheduledAt: invite.scheduledAt,
    durationMinutes: null,
    maxParticipants: null,
    minRankKey: null,
    maxRankKey: null,
    status: invite.sessionStatus,
    createdBy: '',
    createdAt: '',
    updatedAt: '',
    teamName: invite.teamName ?? undefined,
    teamLogoUrl: invite.teamLogoUrl ?? undefined,
    participantCount: undefined,
  };
}

// ─── Per-invite card wrapper (hooks must live in a component, not a callback) ──

function InviteSessionCard({
  invite,
  userId,
}: {
  invite: TryoutInviteView;
  userId: string;
}) {
  const respondMutation = useRespondToInvite(invite.sessionId, userId);

  function handleAccept(sessionId: string) {
    respondMutation.mutate('confirmed');
  }

  function handleDecline(sessionId: string) {
    respondMutation.mutate('declined');
  }

  return (
    <TryoutSessionCard
      session={inviteToSession(invite)}
      participantStatus={invite.participantStatus}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyTryoutInvitesPage() {
  const { profile } = useAuth();
  const invitesQuery = useMyTryoutInvites();
  const invites = invitesQuery.data ?? [];
  const userId = profile?.id ?? '';
  const reduced = useReducedMotion() ?? false;

  return (
    <CompetitivePageShell>
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
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            <Inbox className="h-8 w-8 text-white/25" />
            <p className="text-[15px] font-medium text-white/55">No tryout invites</p>
            <p className="text-[13px] text-white/35 max-w-xs">
              When a team invites you to a tryout, it appears here.
            </p>
          </div>
        ) : (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="space-y-3"
          >
            {invites.map((invite) => (
              <InviteSessionCard
                key={invite.participantId}
                invite={invite}
                userId={userId}
              />
            ))}
          </motion.div>
        )}
      </div>
    </CompetitivePageShell>
  );
}
