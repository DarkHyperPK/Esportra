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
  useAcceptTimeProposal, useDeclineTimeProposal, useProposeTime, useRequestTimeClear, useRespondTimeClear,
  useWithdrawTimeClear, useWithdrawTimeProposal,
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
  const clearRequest = session.timeClearRequest ?? null;
  const requestClear = useRequestTimeClear(session.id);
  const respondClear = useRespondTimeClear(clearRequest?.id ?? '');
  const withdrawClear = useWithdrawTimeClear(clearRequest?.id ?? '');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const clearMine = !!clearRequest && clearRequest.requestedByTeamId === myTeamId;
  const [countering, setCountering] = useState(false);
  const [error, setError] = useState('');

  const opponent = opponentName ?? 'The other team';
  const checkInStarted = !!(session.team1CheckedInAt || session.team2CheckedInAt);
  const open = session.status === 'scheduled' && !checkInStarted && isStaff;
  const mine = !!proposal && proposal.proposedByTeamId === myTeamId;
  const busy = propose.isPending || accept.isPending || decline.isPending || withdraw.isPending
    || requestClear.isPending || respondClear.isPending || withdrawClear.isPending;

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
          {!countering && !clearRequest && !confirmingClear && (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => setCountering(true)} className={ROOM_GHOST}>Propose another time</button>
              <button type="button" disabled={busy} onClick={() => setConfirmingClear(true)} className={ROOM_GHOST}>Ask to clear the time</button>
            </div>
          )}
          {confirmingClear && !clearRequest && (
            <div className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-3">
              <p className="text-[13px] text-zinc-300">
                Ask {opponent} to clear this time? It stays as it is until they agree.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => run(async () => { await requestClear.mutateAsync(); setConfirmingClear(false); }, 'Could not send the request. Try again.')} className={PRIMARY}>
                  {requestClear.isPending ? 'Sending…' : 'Send request'}
                </button>
                <button type="button" onClick={() => setConfirmingClear(false)} className={ROOM_GHOST}>Never mind</button>
              </div>
            </div>
          )}
          {clearRequest && clearMine && (
            <div className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-3">
              <p className="text-[13px] text-zinc-300">You asked to clear this time. Waiting for {opponent} to agree.</p>
              <button type="button" disabled={busy} onClick={() => run(() => withdrawClear.mutateAsync(), 'Could not withdraw. Try again.')} className={ROOM_GHOST}>
                {withdrawClear.isPending ? 'Withdrawing…' : 'Withdraw request'}
              </button>
            </div>
          )}
          {clearRequest && !clearMine && (
            <div className="space-y-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.05] p-3">
              <p className="text-[13px] text-amber-100/90">{opponent} asked to clear this time. If you agree, check-in is cancelled and you both pick a new time.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => run(() => respondClear.mutateAsync(true), 'Could not agree. Try again.')} className={PRIMARY}>
                  {respondClear.isPending ? 'Clearing…' : 'Agree, clear it'}
                </button>
                <button type="button" disabled={busy} onClick={() => run(() => respondClear.mutateAsync(false), 'Could not answer. Try again.')} className={ROOM_GHOST}>Keep the time</button>
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
