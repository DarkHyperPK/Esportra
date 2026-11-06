import { useParams, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { InlineNotice } from '@/components/ui/kit';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { ScrimCheckinPanel, ScrimCheckinSkeleton } from '@/components/competitive/scrims/ScrimCheckinPanel';
import { ScrimVetoSection } from '@/components/competitive/scrims/ScrimVetoSection';
import { ScrimDisputeBanner } from '@/components/competitive/scrims/ScrimDisputeBanner';
import { ScrimFaceOff } from '@/components/competitive/scrims/room/ScrimFaceOff';
import { ScrimStageRail } from '@/components/competitive/scrims/room/ScrimStageRail';
import { ScrimNextStepCard } from '@/components/competitive/scrims/room/ScrimNextStepCard';
import { ScrimRoomChat } from '@/components/competitive/scrims/room/ScrimRoomChat';
import { CheckinSummary } from '@/components/competitive/scrims/room/CheckinSummary';
import { ScrimLobbyPanel } from '@/components/competitive/scrims/room/ScrimLobbyPanel';
import { ScrimGamesPanel } from '@/components/competitive/scrims/room/games/ScrimGamesPanel';
import { ScrimSchedulePanel } from '@/components/competitive/scrims/room/ScrimSchedulePanel';
import { useScrimSession } from '@/hooks/competitive/useScrims';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { useNow } from '@/hooks/useNow';
import { deriveScrimNextAction } from '@/services/scrimNextAction';
import { describeNextStep, formatRoomTime } from '@/services/scrimRoomView';
import { isScrimStaff } from '@/lib/scrimGames';

function SessionSkeleton() {
  return (
    <div className="space-y-6 px-4 pt-8 lg:px-8">
      <div className="h-4 w-24 animate-pulse bg-white/[0.06]" />
      <div className="h-56 animate-pulse border border-white/[0.06] bg-white/[0.04]" />
      <ScrimCheckinSkeleton />
    </div>
  );
}

const BACK_LINK =
  'text-[12px] text-white/40 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

export default function ScrimSessionPage() {
  const { id = '' } = useParams<{ id: string }>();
  const sessionQuery = useScrimSession(id);
  const teamsQuery = useMyTeamsSummary();
  const catalog = useGameCatalogContext();
  const reduce = useReducedMotion();
  const nowMs = useNow(30_000);
  const session = sessionQuery.data;

  const myTeamIds = ((teamsQuery.data ?? []) as { id: string }[]).map((t) => t.id);
  const mySide: 1 | 2 | null = session
    ? myTeamIds.includes(session.team1Id) ? 1 : myTeamIds.includes(session.team2Id) ? 2 : null
    : null;
  const myTeamId = mySide === 1 ? session?.team1Id ?? null : mySide === 2 ? session?.team2Id ?? null : null;
  const canManage = isScrimStaff(session?.myRole);

  const arrive = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18, delay } };

  function goToPanel(targetId: string) {
    document.getElementById(targetId)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  if (sessionQuery.isLoading) {
    return <CompetitivePageShell><SessionSkeleton /></CompetitivePageShell>;
  }

  if (sessionQuery.isError || !session) {
    const status = (sessionQuery.error as { status?: number } | null)?.status;
    const denied = status === 403 || status === 404;
    return (
      <CompetitivePageShell>
        <div className="max-w-2xl space-y-4 px-4 pb-12 pt-8 lg:px-8">
          <p className="text-[14px] text-white/55">
            {denied
              ? 'This session is not available. It may have been cancelled or you may not have access.'
              : 'Could not load this session. Check your connection and try again.'}
          </p>
          {denied
            ? <Link to="/competitive/scrims/workspace" className={BACK_LINK}>← Back to Your Scrims</Link>
            : <button onClick={() => sessionQuery.refetch()} className="rounded-none border border-white/[0.08] px-4 py-1.5 text-[13px] text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">Retry</button>}
        </div>
      </CompetitivePageShell>
    );
  }

  if (!teamsQuery.isLoading && mySide === null) {
    return (
      <CompetitivePageShell>
        <div className="max-w-2xl space-y-4 px-4 pb-12 pt-8 lg:px-8">
          <p className="text-[14px] text-white/55">You don&apos;t have access to this match room.</p>
          <Link to="/competitive/scrims/workspace" className={BACK_LINK}>← Back to Your Scrims</Link>
        </div>
      </CompetitivePageShell>
    );
  }

  const status = session.status;
  const catalogGame = catalog.games.find((g) => g.slug === session.gameSlug);
  const opponent = mySide === 2 ? session.team1Name ?? null : session.team2Name ?? null;
  const cancelledByName = session.cancelledByTeamId === session.team1Id ? session.team1Name : session.cancelledByTeamId === session.team2Id ? session.team2Name : null;

  const next = deriveScrimNextAction(session, myTeamId ?? '', nowMs);
  const nextView = describeNextStep(
    next,
    { opponent, cancelledReason: session.cancelledReason, cancelledByName, proposedAt: session.timeProposal?.proposedAt },
    nowMs,
  );

  // Check-in only exists once a time has been agreed.
  const canCheckIn = (status === 'scheduled' || status === 'in_progress') && !!session.scheduledAt;
  const showSchedule = status === 'scheduled' || status === 'in_progress';
  const showResult = status === 'in_progress' || status === 'completed' || status === 'disputed';
  const showLobby = status === 'scheduled' || status === 'in_progress';
  const bothCheckedIn = !!session.team1CheckedInAt && !!session.team2CheckedInAt;
  const score = session.team1Score != null && session.team2Score != null && status !== 'scheduled'
    ? { team1: session.team1Score, team2: session.team2Score }
    : null;

  return (
    <CompetitivePageShell>
      <div className="space-y-6 px-4 pb-12 pt-6 lg:px-8 lg:pt-8">
        <div className="flex items-center gap-3">
          <Link to="/competitive/scrims/workspace" className={BACK_LINK}>← Your Scrims</Link>
          {sessionQuery.isFetching && !sessionQuery.isLoading && (
            <span className="text-[11px] text-white/30" aria-live="polite">Updating…</span>
          )}
        </div>

        {!canManage && (
          <InlineNotice tone="neutral">
            Only captains and managers can manage this scrim. You can view the match room and follow along.
          </InlineNotice>
        )}

        <motion.div {...arrive(0)} className="space-y-6">
          <ScrimFaceOff
            team1={{ id: session.team1Id, name: session.team1Name ?? 'Team 1', logoUrl: session.team1Logo ?? null, isMine: mySide === 1, checkedIn: !!session.team1CheckedInAt }}
            team2={{ id: session.team2Id, name: session.team2Name ?? 'Team 2', logoUrl: session.team2Logo ?? null, isMine: mySide === 2, checkedIn: !!session.team2CheckedInAt }}
            status={status}
            gameSlug={session.gameSlug}
            gameName={catalogGame?.name ?? null}
            gameLogo={catalogGame?.logo ?? null}
            bestOf={session.bestOf}
            when={formatRoomTime(session.scheduledAt) || 'Time not set yet'}
            score={score}
            showCheckin={status === 'scheduled'}
          />
          <ScrimStageRail stage={next.stage} />
          <ScrimNextStepCard
            view={nextView}
            deadline={next.deadline}
            onDeadlinePassed={() => void sessionQuery.refetch()}
            onGo={goToPanel}
          />
        </motion.div>

        {session.dispute && (
          <motion.div {...arrive(0.04)} id="room-dispute" className="scroll-mt-6">
            <ScrimDisputeBanner
              dispute={session.dispute}
              callerTeamId={myTeamId ?? ''}
              sessionTeam1Id={session.team1Id}
              sessionId={session.id}
              isCaptain={canManage}
              onEvidenceSubmitted={() => sessionQuery.refetch()}
            />
          </motion.div>
        )}

        <div className={showResult ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start' : 'max-w-[760px]'}>
          {showResult && (
            <motion.div {...arrive(0.12)} id="room-result" className="order-2 min-w-0 scroll-mt-6 lg:order-1">
              <ScrimGamesPanel session={session} myTeamId={myTeamId} isStaff={canManage} />
            </motion.div>
          )}

          <div className="order-1 min-w-0 space-y-4 lg:order-2 lg:sticky lg:top-6">
            {showSchedule && (
              <motion.div {...arrive(0.06)} id="room-schedule" className="scroll-mt-6">
                <ScrimSchedulePanel session={session} myTeamId={myTeamId} opponentName={opponent} isStaff={canManage} />
              </motion.div>
            )}

            {canCheckIn && (
              <motion.div {...arrive(0.08)} id="room-checkin" className="scroll-mt-6">
                {bothCheckedIn ? (
                  <CheckinSummary team1={session.team1Name ?? 'Team 1'} team2={session.team2Name ?? 'Team 2'} />
                ) : (
                  <ScrimCheckinPanel
                    session={session}
                    callerTeamId={myTeamId ?? ''}
                    isCaptain={canManage}
                    onCheckinSuccess={() => sessionQuery.refetch()}
                  />
                )}
              </motion.div>
            )}

            {status !== 'cancelled' && (
              <motion.div {...arrive(0.1)} id="room-veto" className="scroll-mt-6">
                <ScrimVetoSection
                  vetoSessionId={session.vetoSessionId ?? null}
                  vetoMyToken={session.vetoMyToken ?? null}
                  gameSlug={session.gameSlug}
                  sessionStatus={status}
                  onRetry={() => void sessionQuery.refetch()}
                />
              </motion.div>
            )}

            {showLobby && (
              <motion.div {...arrive(0.14)} aria-label="Lobby">
                <ScrimLobbyPanel session={session} />
              </motion.div>
            )}

            {status === 'cancelled' && (
              <InlineNotice tone="neutral">{nextView.body}</InlineNotice>
            )}
          </div>
        </div>
      </div>

      {canManage && status !== 'cancelled' && opponent && (
        <ScrimRoomChat sessionId={session.id} opponentName={opponent} openOnArrival={status === 'scheduled' && !session.scheduledAt} />
      )}
    </CompetitivePageShell>
  );
}
