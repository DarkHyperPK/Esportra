/**
 * "Needs attention" queue for the tournament dashboard overview.
 *
 * Turns raw counts into a short, ordered list of things the organizer should
 * act on, each pointing at the section where the fix lives.
 */
import type { DashboardLinkId, DashboardSectionId } from './dashboardNav';

export type AttentionTone = 'critical' | 'warning' | 'info';

export interface AttentionItem {
  id: string;
  tone: AttentionTone;
  title: string;
  detail: string;
  target: DashboardSectionId | DashboardLinkId;
}

export type CheckInState = 'none' | 'not_open' | 'open' | 'closed';

export interface AttentionInput {
  status: string;
  participantNoun: 'players' | 'teams';
  stageCount: number;
  mockCount: number;
  pendingApprovals: number;
  pendingPayments: number;
  draftInvites: number;
  openDisputes: number;
  checkInState: CheckInState;
  pendingCheckIns: number;
  checkInCountdown?: string | null;
  /** Draft setup gaps, one entry per configuration panel with missing fields. */
  setupGaps?: SetupGap[];
}

export interface SetupGap {
  panel: DashboardSectionId;
  label: string;
  requiredMissing: number;
  recommendedMissing: number;
}

const TONE_ORDER: Record<AttentionTone, number> = { critical: 0, warning: 1, info: 2 };

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

function checkInItem(input: AttentionInput): AttentionItem | null {
  if (input.pendingCheckIns <= 0) return null;
  const count = input.pendingCheckIns;
  const noun = count === 1 ? input.participantNoun.replace(/s$/, '') : input.participantNoun;
  if (input.checkInState === 'closed') {
    return {
      id: 'check-in-missed',
      tone: 'critical',
      title: `${count} ${noun} missed check-in`,
      detail: 'Remove them before seeding so the bracket has no empty slots.',
      target: 'participants',
    };
  }
  if (input.checkInState === 'open') {
    return {
      id: 'check-in-open',
      tone: 'warning',
      title: `${count} ${noun} not checked in yet`,
      detail: input.checkInCountdown ? `Check-in closes in ${input.checkInCountdown}.` : 'Check-in is open now.',
      target: 'participants',
    };
  }
  return null;
}

function countItems(input: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (input.openDisputes > 0) {
    items.push({
      id: 'disputes',
      tone: 'critical',
      title: `${input.openDisputes} open ${plural(input.openDisputes, 'dispute', 'disputes')}`,
      detail: 'Matches are waiting on a ruling.',
      target: 'disputes',
    });
  }
  if (input.pendingPayments > 0) {
    items.push({
      id: 'payments',
      tone: 'warning',
      title: `${input.pendingPayments} ${plural(input.pendingPayments, 'payment', 'payments')} to verify`,
      detail: 'Review the receipts so these entries can be confirmed.',
      target: 'payments',
    });
  }
  if (input.pendingApprovals > 0) {
    items.push({
      id: 'approvals',
      tone: 'warning',
      title: `${input.pendingApprovals} ${plural(input.pendingApprovals, 'registration', 'registrations')} awaiting approval`,
      detail: 'Approve or reject them from the participant list.',
      target: 'participants',
    });
  }
  if (input.draftInvites > 0) {
    items.push({
      id: 'invite-drafts',
      tone: 'info',
      title: `${input.draftInvites} invite ${plural(input.draftInvites, 'draft', 'drafts')} not sent`,
      detail: 'Drafts do not reach captains until you send them.',
      target: 'invitations',
    });
  }
  return items;
}

function setupItems(input: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];
  const isFinished = input.status === 'completed' || input.status === 'cancelled';
  if (input.mockCount > 0) {
    items.push({
      id: 'mock-teams',
      tone: input.status === 'draft' ? 'info' : 'warning',
      title: `${input.mockCount} mock ${plural(input.mockCount, 'team', 'teams')} still loaded`,
      detail: 'Clear simulation data before real matches start.',
      target: 'participants',
    });
  }
  if (input.stageCount === 0 && !isFinished) {
    items.push({
      id: 'no-stages',
      tone: 'warning',
      title: 'No stages yet',
      detail: 'Add a stage to generate the bracket.',
      target: 'format-stages',
    });
  }
  return items;
}

function setupGapItems(input: AttentionInput): AttentionItem[] {
  if (input.status !== 'draft') return [];
  return (input.setupGaps ?? []).flatMap((gap): AttentionItem[] => {
    if (gap.requiredMissing > 0) {
      return [{
        id: `setup-${gap.panel}`,
        tone: 'critical',
        title: `${gap.label}: ${gap.requiredMissing} required ${plural(gap.requiredMissing, 'field', 'fields')} missing`,
        detail: 'Publishing is blocked until this is filled in.',
        target: gap.panel,
      }];
    }
    if (gap.recommendedMissing > 0) {
      return [{
        id: `setup-${gap.panel}`,
        tone: 'info',
        title: `${gap.label}: ${gap.recommendedMissing} recommended ${plural(gap.recommendedMissing, 'field', 'fields')} empty`,
        detail: 'Optional, but players see a more complete page.',
        target: gap.panel,
      }];
    }
    return [];
  });
}

export function deriveAttentionItems(input: AttentionInput): AttentionItem[] {
  const checkIn = checkInItem(input);
  const items = [...(checkIn ? [checkIn] : []), ...countItems(input), ...setupItems(input), ...setupGapItems(input)];
  return [...items].sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}

/** Drops items that point at places the current actor cannot open. */
export function filterAttentionByAccess(items: AttentionItem[], reachable: Set<string>): AttentionItem[] {
  return items.filter((item) => reachable.has(item.target));
}
