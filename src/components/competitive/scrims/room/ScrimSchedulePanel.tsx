/**
 * ScrimSchedulePanel
 *
 * Agreeing the match time, in the room. Whichever captain is ready proposes; the
 * other accepts with one tap, declines, or suggests another. Once a time is set
 * it can be changed until check-in starts.
 */

import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { InlineNotice } from '@/components/ui/kit';
import {
  useAcceptTimeProposal, useDeclineTimeProposal, useProposeTime, useResetScrimTime, useWithdrawTimeProposal,
} from '@/hooks/competitive/useScrimSchedule';
import { getApiErrorMessage } from '@/lib/apiClient';
import { formatRoomTime } from '@/services/scrimRoomView';
import type { ScrimSession } from '@/types/competitive';
import { ProposeTimeForm } from './ProposeTimeForm';
import { ROOM_EYEBROW, ROOM_GHOST, ROOM_PANEL } from './roomStyles';

interface ScrimSchedulePanelProps {
  session: ScrimSession;
  myTeamId: string | null;
  opponentName: string | null;
  /** Captain/manager of a team in the match. */
  isStaff: boolean;
}

const PRIMARY =
  'min-h-[44px] rounded-lg bg-white px-5 text-[13px] font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080a] disabled:opacity-40';

export function ScrimSchedulePanel({ session, myTeamId, opponentName, isStaff }: ScrimSchedulePanelProps) {
  const proposal = session.timeProposal ?? null;
  const propose = useProposeTime(session.id);
  const accept = useAcceptTimeProposal(proposal?.id ?? '');
  const decline = useDeclineTimeProposal(proposal?.id ?? '');
  const withdraw = useWithdrawTimeProposal(proposal?.id ?? '');
  const reset = useResetScrimTime(session.id);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [countering, setCountering] = useState(false);
  const [error, setError] = useState('');

  const opponent = opponentName ?? 'The other team';
  const checkInStarted = !!(session.team1CheckedInAt || session.team2CheckedInAt);
  const open = session.status === 'scheduled' && !checkInStarted && isStaff;
  const mine = !!proposal && proposal.proposedByTeamId === myTeamId;
  const busy = propose.isPending || accept.isPending || decline.isPending || withdraw.isPending || reset.isPending;

  async function run(action: () => Promise<unknown>, fallback: string) {
    setError('');
    try {
      await action();
      setCountering(false);
    } catch (err) {
      setError(getApiErrorMessage(err, fallback));
    }
  }

  const send = (iso: string, note: string) =>
    run(() => propose.mutateAsync({ proposedAt: iso, note: note || undefined }), 'Could not send that time. Try again.');

  // Frozen: show the time that was agreed.
  if (!open) {
    if (!session.scheduledAt) return null;
    return (
      <div className={ROOM_PANEL}>
        <p className={ROOM_EYEBROW}>Match time</p>
        <p className="flex items-center gap-2 text-[15px] font-semibold text-white">
          <CalendarClock className="h-4 w-4 text-white/50" aria-hidden="true" />
          {formatRoomTime(session.scheduledAt)}
        </p>
      </div>
    );
  }

  return (
    <div className={ROOM_PANEL}>
      <p className={ROOM_EYEBROW}>{session.scheduledAt && !proposal ? 'Match time' : 'Agree a time'}</p>

      {proposal && !mine && (
        <div className="space-y-3">
          <p className="text-[13px] text-zinc-400">{opponent} proposed</p>
          <p className="font-heading text-[22px] font-black leading-tight text-white">{formatRoomTime(proposal.proposedAt)}</p>
          {proposal.note && <p className="text-[13px] italic text-zinc-400">&ldquo;{proposal.note}&rdquo;</p>}
          {error && <InlineNotice tone="critical">{error}</InlineNotice>}
          {!countering && (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => run(() => accept.mutateAsync(), 'Could not accept that time. Try again.')} className={PRIMARY}>
                {accept.isPending ? 'Accepting…' : 'Accept this time'}
              </button>
              <button type="button" disabled={busy} onClick={() => setCountering(true)} className={ROOM_GHOST}>Suggest another</button>
              <button type="button" disabled={busy} onClick={() => run(() => decline.mutateAsync(), 'Could not decline. Try again.')} className={ROOM_GHOST}>
                {decline.isPending ? 'Declining…' : 'Decline'}
              </button>
            </div>
          )}
          {countering && (
            <ProposeTimeForm onSubmit={send} isPending={propose.isPending} error="" onCancel={() => setCountering(false)} submitLabel="Suggest" />
          )}
        </div>
      )}

      {proposal && mine && (
        <div className="space-y-3">
          <p className="text-[13px] text-zinc-400">You proposed. Waiting for {opponent} to answer.</p>
          <p className="font-heading text-[22px] font-black leading-tight text-white">{formatRoomTime(proposal.proposedAt)}</p>
          {error && <InlineNotice tone="critical">{error}</InlineNotice>}
          {!countering ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => setCountering(true)} className={ROOM_GHOST}>Propose a different time</button>
              <button type="button" disabled={busy} onClick={() => run(() => withdraw.mutateAsync(), 'Could not withdraw. Try again.')} className={ROOM_GHOST}>
                {withdraw.isPending ? 'Withdrawing…' : 'Withdraw'}
              </button>
            </div>
          ) : (
            <ProposeTimeForm onSubmit={send} isPending={propose.isPending} error={error} onCancel={() => setCountering(false)} submitLabel="Propose" />
          )}
        </div>
      )}

      {!proposal && session.scheduledAt && (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-white">
            <CalendarClock className="h-4 w-4 text-white/50" aria-hidden="true" />
            {formatRoomTime(session.scheduledAt)}
          </p>
          {error && <InlineNotice tone="critical">{error}</InlineNotice>}
          {!countering && !confirmingReset && (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => setCountering(true)} className={ROOM_GHOST}>Change the time</button>
              <button type="button" disabled={busy} onClick={() => setConfirmingReset(true)} className={ROOM_GHOST}>Clear the time</button>
            </div>
          )}
          {confirmingReset && (
            <div className="space-y-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.05] p-3">
              <p className="text-[13px] text-amber-100/90">
                Clear this time? Check-in is cancelled and you both start again. {opponent} is told.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => run(async () => { await reset.mutateAsync(); setConfirmingReset(false); }, 'Could not clear the time. Try again.')} className={PRIMARY}>
                  {reset.isPending ? 'Clearing…' : 'Yes, clear it'}
                </button>
                <button type="button" onClick={() => setConfirmingReset(false)} className={ROOM_GHOST}>Keep it</button>
              </div>
            </div>
          )}
          {countering && (
            <ProposeTimeForm onSubmit={send} isPending={propose.isPending} error={error} onCancel={() => setCountering(false)} submitLabel="Propose" />
          )}
        </div>
      )}

      {!proposal && !session.scheduledAt && (
        <div className="space-y-3">
          <p className="text-[13px] text-zinc-400">
            No time set yet. Pick one and {opponent} just has to accept. Check-in is set up automatically once you agree.
          </p>
          <ProposeTimeForm onSubmit={send} isPending={propose.isPending} error={error} />
        </div>
      )}
    </div>
  );
}
