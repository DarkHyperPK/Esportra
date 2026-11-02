/**
 * scrimRoomView.ts
 *
 * Pure view logic for the scrim room: where the stage tracker is, and the one
 * sentence + action the next-step card shows. Built on deriveScrimNextAction.
 */

import { formatTimeLeft } from '@/services/scrimUpNext';
import type { ScrimNextAction, ScrimStage } from '@/services/scrimNextAction';

export const ROOM_STEPS = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'live', label: 'Live' },
  { key: 'result', label: 'Result' },
  { key: 'confirmed', label: 'Done' },
] as const;

/** Element ids the next-step card scrolls to. */
export type RoomTarget = 'room-checkin' | 'room-veto' | 'room-result' | 'room-dispute';

export interface RailState {
  /** Index of the active step; ROOM_STEPS.length = all done; -1 = stopped. */
  current: number;
  variant: 'normal' | 'disputed' | 'cancelled';
}

export function railState(stage: ScrimStage): RailState {
  switch (stage) {
    case 'scheduled': return { current: 0, variant: 'normal' };
    case 'checkin': return { current: 1, variant: 'normal' };
    case 'live': return { current: 2, variant: 'normal' };
    case 'result': return { current: 3, variant: 'normal' };
    case 'disputed': return { current: 3, variant: 'disputed' };
    case 'confirmed': return { current: ROOM_STEPS.length, variant: 'normal' };
    case 'cancelled': return { current: -1, variant: 'cancelled' };
  }
}

export interface NextStepContext {
  opponent: string | null;
  cancelledReason?: string | null;
  /** Name of the team that cancelled, when known. */
  cancelledByName?: string | null;
}

export interface NextStepView {
  headline: string;
  body: string;
  target: RoomTarget | null;
  urgent: boolean;
}

const view = (
  headline: string,
  body: string,
  target: RoomTarget | null = null,
  urgent = false,
): NextStepView => ({ headline, body, target, urgent });

function cancelledBody(ctx: NextStepContext): string {
  if (ctx.cancelledReason === 'checkin_timeout') {
    return 'Not both teams checked in on time, so the scrim was cancelled.';
  }
  if (ctx.cancelledReason === 'cancelled_by_team') {
    return ctx.cancelledByName ? `${ctx.cancelledByName} cancelled this scrim.` : 'A team cancelled this scrim.';
  }
  return 'This scrim was cancelled.';
}

export function describeNextStep(next: ScrimNextAction, ctx: NextStepContext, nowMs: number = Date.now()): NextStepView {
  const opp = ctx.opponent ?? 'your opponent';
  const left = formatTimeLeft(next.deadline, nowMs);

  switch (next.action) {
    case 'wait':
      return view(
        left ? `Check-in opens in ${left}` : 'Waiting for the start time',
        'Both captains check in from 15 minutes before the start. Be ready with your lineup.',
      );
    case 'check_in':
      return view(
        'Check in now',
        left
          ? `Check-in closes in ${left}. If a team misses it, the scrim is cancelled.`
          : 'Check-in is closing. If a team misses it, the scrim is cancelled.',
        'room-checkin',
        true,
      );
    case 'wait_opponent':
      return next.stage === 'result'
        ? view(`Waiting for ${opp} to confirm`, 'They have your result. You will be told when they respond.')
        : view("You're checked in", `Waiting for ${opp} to check in${left ? `. Check-in closes in ${left}` : ''}.`);
    case 'report_result':
      return view('Report the result', 'Your scrim is live. Report the final score when the series ends.', 'room-result');
    case 'confirm_result':
      return view(`${opp} reported a result`, 'Confirm the score, or open a dispute if it is wrong.', 'room-result');
    case 'submit_evidence':
      return view('Add your evidence', `${opp} disputed the result. Add screenshots or notes so staff can rule.`, 'room-dispute');
    case 'wait_staff':
      return view('Staff are reviewing the dispute', 'No action needed. You will be told the outcome.');
    case 'none':
      return next.stage === 'cancelled'
        ? view('Scrim cancelled', cancelledBody(ctx))
        : view('Scrim complete', 'The result is confirmed and counts toward both team records.');
  }
}

/** "Mon, Nov 2 · 8:00 PM" in the viewer's locale; empty when there is no time. */
export function formatRoomTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}
