/**
 * useTournamentOverviewModel.ts
 *
 * Derives everything the dashboard header and Overview panel show: lifecycle
 * phase, key numbers, the "Needs you" queue and event details. Pure logic
 * lives in src/services/tournamentDashboard; this hook only wires inputs,
 * the coarse clock and the (cached) invitations query.
 */

import { useMemo } from 'react';
import type { DashboardParticipant, DashboardStage, DashboardTournament } from '@/hooks/useTournamentDashboard';
import type { CompletionSummary } from '@/hooks/useCompletionState';
import { useNow } from '@/hooks/useNow';
import { useTournamentInvitations } from '@/hooks/useTournamentInvitations';
import { formatCurrency } from '@/utils/formatCurrency';
import { getParticipantMode, getPersistedTournamentFormat } from '@/utils/gameFeatures';
import { countCheckedInParticipants, countPendingCheckInParticipants, isActiveRegistration } from '@/utils/brCheckIn';
import {
  deriveTournamentPhase,
  getDerivedPhaseLabel,
  getRegistrationOpensFromSettings,
  hasCheckInClosed,
  hasCheckInNotOpenedYet,
  isCheckInOpen,
  resolveCheckInWindow,
  type TournamentDerivedPhase,
} from '@/utils/tournamentLifecycle';
import {
  deriveAttentionItems,
  filterAttentionByAccess,
  type AttentionItem,
  type CheckInState,
  type SetupGap,
} from '@/services/tournamentDashboard/attention';
import { buildLifecycleSteps, phaseTone, resolveDashboardPhase, type LifecycleStep, type PhaseTone } from '@/services/tournamentDashboard/lifecycle';
import { formatCountdown } from '@/services/tournamentDashboard/countdown';
import type { DashboardSectionId } from '@/services/tournamentDashboard/dashboardNav';

const SETUP_PANEL_LABELS: Partial<Record<DashboardSectionId, string>> = {
  'basic-info': 'Basic info',
  'format-stages': 'Format & stages',
  registration: 'Registration',
  'prize-payouts': 'Prize & payouts',
  branding: 'Branding',
  settings: 'Settings',
};

export interface OverviewKpis {
  participantNoun: 'players' | 'teams';
  registered: number;
  capacity: number;
  checkIn: { checkedIn: number; eligible: number } | null;
  stageCount: number;
  prizePool: string;
  entryFee: string;
}

export interface TournamentOverviewModel {
  phase: TournamentDerivedPhase;
  phaseLabel: string;
  phaseTone: PhaseTone;
  steps: LifecycleStep[];
  kpis: OverviewKpis;
  attention: AttentionItem[];
  details: { label: string; value: string }[];
}

interface OverviewModelInput {
  tournament: DashboardTournament | undefined;
  participants: DashboardParticipant[];
  stages: DashboardStage[];
  mockCount: number;
  completionSummary: CompletionSummary;
  disputeCount: number;
  reachable: Set<string>;
  isBattleRoyale: boolean;
}

export function formatDashboardDate(value?: string | null): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const titleCase = (value?: string | null) =>
  value ? value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : 'Not set';

function toSetupGaps(summary: CompletionSummary): SetupGap[] {
  return Object.entries(summary.panels).flatMap(([panel, state]) => {
    const label = SETUP_PANEL_LABELS[panel as DashboardSectionId];
    if (!label) return [];
    return [{
      panel: panel as DashboardSectionId,
      label,
      requiredMissing: state.requiredMissing.length,
      recommendedMissing: state.recommendedMissing.length,
    }];
  });
}

/** Returns null until the tournament has loaded. */
export function useTournamentOverviewModel(input: OverviewModelInput): TournamentOverviewModel | null {
  const { tournament, participants, stages, mockCount, completionSummary, disputeCount, reachable, isBattleRoyale } = input;
  const now = useNow(30_000);
  const invitationsEnabled = reachable.has('invitations');
  const { invitations } = useTournamentInvitations(invitationsEnabled ? tournament?.id : null);
  const draftInvites = (invitations.data?.invitations ?? []).filter((invite) => invite.status === 'draft').length;

  return useMemo(() => {
    if (!tournament) return null;
    const at = new Date(now);
    const checkInRequired = Boolean(tournament.check_in_required);
    const window = resolveCheckInWindow({
      startDate: tournament.start_date,
      checkInDeadline: tournament.check_in_deadline,
      settings: tournament.settings,
    });
    const phase = resolveDashboardPhase(
      deriveTournamentPhase({
        status: tournament.status,
        registrationOpens: getRegistrationOpensFromSettings(tournament.settings),
        registrationDeadline: tournament.registration_deadline,
        startDate: tournament.start_date,
        now: at,
      }),
      checkInRequired && isCheckInOpen(window, at),
    );

    const active = participants.filter((p) => !['rejected', 'cancelled', 'withdrawn', 'disqualified'].includes(p.status));
    const eligible = participants.filter((p) => isActiveRegistration(p.status));
    const checkedIn = countCheckedInParticipants(participants);
    const pendingCheckIns = countPendingCheckInParticipants(participants);
    const checkInState: CheckInState = !checkInRequired || !window.closesAt
      ? 'none'
      : hasCheckInClosed(window, at) ? 'closed' : hasCheckInNotOpenedYet(window, at) ? 'not_open' : 'open';
    const participantNoun: 'players' | 'teams' =
      getParticipantMode(tournament.game || '', tournament.game_mode) === 'solo' ? 'players' : 'teams';
    const entryFee = parseFloat(tournament.entry_fee || '0');

    const attention = filterAttentionByAccess(
      deriveAttentionItems({
        status: tournament.status,
        participantNoun,
        stageCount: stages.length,
        mockCount,
        pendingApprovals: active.filter((p) => p.status === 'pending').length,
        pendingPayments: active.filter((p) => p.payment_status === 'pending').length,
        draftInvites,
        openDisputes: disputeCount,
        checkInState,
        pendingCheckIns,
        checkInCountdown: window.closesAt ? formatCountdown(window.closesAt.getTime() - now, false) : null,
        setupGaps: toSetupGaps(completionSummary),
      }),
      reachable,
    );

    return {
      phase,
      phaseLabel: getDerivedPhaseLabel(phase),
      phaseTone: phaseTone(phase),
      steps: buildLifecycleSteps(phase, checkInRequired),
      kpis: {
        participantNoun,
        registered: tournament.current_participants ?? active.length,
        capacity: tournament.max_participants ?? tournament.max_teams ?? 0,
        checkIn: checkInRequired ? { checkedIn, eligible: eligible.length } : null,
        stageCount: stages.length,
        prizePool: formatCurrency(parseFloat(tournament.prize_pool || '0'), tournament.currency),
        entryFee: entryFee > 0 ? formatCurrency(entryFee, tournament.currency) : 'Free',
      },
      attention,
      details: [
        { label: 'Starts', value: formatDashboardDate(tournament.start_date) },
        { label: 'Ends', value: formatDashboardDate(tournament.end_date) },
        { label: 'Registration closes', value: formatDashboardDate(tournament.registration_deadline) },
        { label: 'Format', value: isBattleRoyale ? 'Battle royale' : titleCase(getPersistedTournamentFormat(tournament) || tournament.format) },
        { label: 'Team size', value: (tournament.team_size ?? 1) > 1 ? `${tournament.team_size} per team` : 'Solo' },
        { label: 'Venue', value: tournament.is_online === false ? 'LAN' : 'Online' },
      ],
    };
  }, [now, tournament, participants, stages, mockCount, completionSummary, disputeCount, reachable, isBattleRoyale, draftInvites]);
}
