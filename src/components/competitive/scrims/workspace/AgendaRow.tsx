/**
 * AgendaRow
 *
 * One scrim on the agenda: opponent, when, what stage it is at and the one
 * action for my team. Scheduled scrims can be cancelled (two-step, so it
 * cannot happen by accident).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { DangerButton, OutlineButton } from '@/components/ui/button';
import { InlineNotice } from '@/components/ui/kit';
import { useCancelScrimSession } from '@/hooks/competitive/useScrims';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { getApiErrorMessage } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { deriveScrimNextAction } from '@/services/scrimNextAction';
import { actionLabel, describeNextStep, formatRoomTime } from '@/services/scrimRoomView';
import { bestOfLabel } from '@/services/scrimUtils';
import type { ScrimSession } from '@/types/competitive';

interface AgendaRowProps {
  session: ScrimSession;
  teamId: string;
  /** Current time in ms; defaults to now when the row is used on its own. */
  nowMs?: number;
}

export function AgendaRow({ session, teamId, nowMs = Date.now() }: AgendaRowProps) {
  const catalog = useGameCatalogContext();
  const cancel = useCancelScrimSession(session.id);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const iAmTeam1 = session.team1Id === teamId;
  const opponent = (iAmTeam1 ? session.team2Name : session.team1Name) ?? 'Opponent';
  const logo = (iAmTeam1 ? session.team2Logo : session.team1Logo) ?? null;
  const gameName = catalog.games.find((g) => g.slug === session.gameSlug)?.name ?? session.gameSlug ?? 'Scrim';

  const next = deriveScrimNextAction(session, teamId, nowMs);
  const view = describeNextStep(next, { opponent }, nowMs);
  const needsMe = next.action === 'check_in' || next.action === 'report_result'
    || next.action === 'confirm_result' || next.action === 'submit_evidence';
  const canCancel = session.status === 'scheduled';

  async function onCancel() {
    setError('');
    try {
      await cancel.mutateAsync();
      setConfirming(false);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not cancel this scrim. Try again.'));
    }
  }

  return (
    <li className={cn('relative border bg-white/[0.03]', needsMe ? 'border-white/[0.16]' : 'border-white/[0.08]')}>
      {next.action === 'check_in' && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-rose-500" />}

      <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:p-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] font-mono text-[11px] font-semibold text-white/60"
          >
            {logo ? <img src={logo} alt="" className="h-full w-full object-contain p-1" /> : opponent.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="truncate font-heading text-[16px] font-bold text-white">vs {opponent}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-zinc-400">
              <span>{gameName}</span>
              <span aria-hidden="true">·</span>
              <span>{bestOfLabel(session.bestOf ?? null)}</span>
              {session.scheduledAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <CalendarClock className="h-3 w-3" aria-hidden="true" />
                  <span className="tabular-nums">{formatRoomTime(session.scheduledAt)}</span>
                </>
              )}
            </p>
            <p className={cn('text-[12px]', needsMe ? 'font-medium text-white/85' : 'text-zinc-500')}>{view.headline}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canCancel && !confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="px-2 py-2 text-[12px] text-zinc-500 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Cancel
            </button>
          )}
          <Link
            to={`/competitive/scrims/sessions/${session.id}`}
            className={cn(
              'inline-flex min-h-[40px] items-center justify-center px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080a]',
              needsMe
                ? 'bg-white text-black hover:bg-rose-500 hover:text-white'
                : 'border border-white/[0.14] text-white/80 hover:border-white/30 hover:text-white',
            )}
          >
            {actionLabel(next.action)}
          </Link>
        </div>
      </div>

      {confirming && (
        <div className="space-y-2 border-t border-white/[0.08] bg-black/30 p-3.5">
          <p className="text-[13px] text-white/80">
            Cancel this scrim with {opponent}? They will be told, and it can&apos;t be undone.
          </p>
          {error && <InlineNotice tone="critical">{error}</InlineNotice>}
          <div className="flex gap-2">
            <DangerButton size="sm" onClick={onCancel} disabled={cancel.isPending} className="h-9 px-4 text-[12px]">
              {cancel.isPending ? 'Cancelling…' : 'Yes, cancel scrim'}
            </DangerButton>
            <OutlineButton size="sm" onClick={() => { setConfirming(false); setError(''); }} disabled={cancel.isPending} className="h-9 px-3 text-[12px]">
              Keep it
            </OutlineButton>
          </div>
        </div>
      )}
    </li>
  );
}
