/**
 * scrimUpNext.ts
 *
 * Pure presentation logic for the "Up next" action queue
 * (GET /api/scrims/up-next). Not related to the messaging inbox.
 * Copy says what happened, what it means and what to do next.
 */

import type { ScrimUpNextItem, ScrimUpNextResponse } from '@/types/competitive';

export interface UpNextDescription {
  title: string;
  detail: string;
  cta: string;
  href: string;
  /** Time-critical: the action expires soon and missing it has a cost. */
  urgent: boolean;
}

const MIN = 60_000;

/** "5 min", "2h 5m", "1d 6h"; null when missing, invalid or already past. */
export function formatTimeLeft(deadlineIso: string | null, nowMs: number = Date.now()): string | null {
  if (!deadlineIso) return null;
  const ms = new Date(deadlineIso).getTime() - nowMs;
  if (Number.isNaN(ms) || ms <= 0) return null;
  const minutes = Math.floor(ms / MIN);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

const WORKSPACE = '/competitive/scrims/workspace';
const roomPath = (id: string | null) => (id ? `/competitive/scrims/sessions/${id}` : WORKSPACE);

export function describeUpNext(item: ScrimUpNextItem, nowMs: number = Date.now()): UpNextDescription {
  const opp = item.opponentName ?? 'your opponent';
  const left = formatTimeLeft(item.deadline, nowMs);

  switch (item.type) {
    case 'checkin_open':
      return {
        title: `Check in for your scrim vs ${opp}`,
        detail: left
          ? `Check-in closes in ${left}. If a team misses it, the scrim is cancelled.`
          : 'Check-in is closing. If a team misses it, the scrim is cancelled.',
        cta: 'Check in',
        href: roomPath(item.sessionId),
        urgent: true,
      };
    case 'veto_ready':
      return {
        title: `Map veto is open vs ${opp}`,
        detail: 'Both teams are in. Pick and ban maps to start the series.',
        cta: 'Open veto',
        href: roomPath(item.sessionId),
        urgent: true,
      };
    case 'result_to_confirm':
      return {
        title: `${opp} reported the result`,
        detail: 'Confirm the score, or open a dispute if it is wrong.',
        cta: 'Review result',
        href: roomPath(item.sessionId),
        urgent: false,
      };
    case 'time_to_respond':
      return {
        title: `${opp} proposed a match time`,
        detail: 'Accept it, or suggest another time that suits you.',
        cta: 'Respond',
        href: roomPath(item.sessionId),
        urgent: false,
      };
    case 'time_to_propose':
      return {
        title: `Pick a time with ${opp}`,
        detail: 'Propose when you want to play. They only need to accept.',
        cta: 'Pick a time',
        href: roomPath(item.sessionId),
        urgent: false,
      };
    case 'evidence_due':
      return {
        title: `Dispute with ${opp} needs your evidence`,
        detail: 'Add screenshots or notes so staff can rule on the result.',
        cta: 'Add evidence',
        href: roomPath(item.sessionId),
        urgent: false,
      };
    case 'result_to_report':
      return {
        title: `Report the result vs ${opp}`,
        detail: 'Your scrim is live. Report the final score when the series ends.',
        cta: 'Report result',
        href: roomPath(item.sessionId),
        urgent: false,
      };
    case 'offer_received':
      return {
        title: `${opp} wants to scrim`,
        detail: left ? `This offer expires in ${left}.` : 'Accept a time that works, or decline.',
        cta: 'Review offer',
        href: WORKSPACE,
        urgent: false,
      };
  }
}

/** The lead item plus how many more are waiting (including ones the server capped). */
export function pickLead(
  response: ScrimUpNextResponse | undefined,
): { lead: ScrimUpNextItem | null; more: number } {
  const lead = response?.items[0] ?? null;
  if (!lead || !response) return { lead: null, more: 0 };
  return { lead, more: Math.max(0, response.total - 1) };
}

/** Drops one item type, e.g. for pages that already show those items in full. */
export function withoutType(
  response: ScrimUpNextResponse | undefined,
  type: ScrimUpNextItem['type'],
): ScrimUpNextResponse | undefined {
  if (!response) return response;
  const items = response.items.filter((i) => i.type !== type);
  const removed = response.items.length - items.length;
  return { items, total: Math.max(items.length, response.total - removed) };
}
