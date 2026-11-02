/**
 * scrimNextAction.ts
 *
 * Pure derivation of "what should my team do next?" for a scrim session.
 * Mirrors the backend schedule: check-in opens at T-15 min and times out at
 * T+15 min (ScrimCheckinWindowJob / ScrimCheckinTimeoutJob).
 */

import type { ScrimSessionStatus } from '@/types/competitive';

export const CHECKIN_OPENS_BEFORE_MIN = 15;
export const CHECKIN_CLOSES_AFTER_MIN = 15;

export type ScrimStage = 'scheduled' | 'checkin' | 'live' | 'result' | 'disputed' | 'confirmed' | 'cancelled';

export type ScrimAction =
  | 'wait'
  | 'check_in'
  | 'wait_opponent'
  | 'report_result'
  | 'confirm_result'
  | 'submit_evidence'
  | 'wait_staff'
  | 'none';

export interface NextActionSession {
  team1Id: string;
  team2Id: string;
  status: ScrimSessionStatus;
  scheduledAt: string | null;
  resultReportedByTeam1: boolean;
  resultReportedByTeam2: boolean;
  team1CheckedInAt?: string | null;
  team2CheckedInAt?: string | null;
  dispute?: {
    status: 'open' | 'escalated' | 'resolved';
    raisedByTeamId: string;
    responderEvidenceUrls: string[] | null;
  } | null;
}

export interface ScrimNextAction {
  stage: ScrimStage;
  action: ScrimAction;
  /** ISO time the action must happen by, when one exists. */
  deadline: string | null;
}

const MIN = 60_000;
const result = (stage: ScrimStage, action: ScrimAction, deadline: string | null = null): ScrimNextAction => ({
  stage,
  action,
  deadline,
});


function deriveScheduled(s: NextActionSession, iAmTeam1: boolean, now: number): ScrimNextAction {
  if (!s.scheduledAt) return result('scheduled', 'wait');
  const start = new Date(s.scheduledAt).getTime();
  const opens = start - CHECKIN_OPENS_BEFORE_MIN * MIN;
  const closes = start + CHECKIN_CLOSES_AFTER_MIN * MIN;
  const iCheckedIn = !!(iAmTeam1 ? s.team1CheckedInAt : s.team2CheckedInAt);

  if (now < opens) return result('scheduled', 'wait', new Date(opens).toISOString());
  if (now > closes) return result('checkin', 'wait_opponent');
  if (iCheckedIn) return result('checkin', 'wait_opponent', new Date(closes).toISOString());
  return result('checkin', 'check_in', new Date(closes).toISOString());
}

function deriveLive(s: NextActionSession, iAmTeam1: boolean): ScrimNextAction {
  const iReported = iAmTeam1 ? s.resultReportedByTeam1 : s.resultReportedByTeam2;
  const theyReported = iAmTeam1 ? s.resultReportedByTeam2 : s.resultReportedByTeam1;
  if (theyReported && !iReported) return result('result', 'confirm_result');
  if (iReported) return result('result', 'wait_opponent');
  return result('live', 'report_result');
}

function deriveDisputed(s: NextActionSession, myTeamId: string): ScrimNextAction {
  const d = s.dispute;
  if (!d || d.status === 'resolved') return result('disputed', 'wait_staff');
  const iRaised = d.raisedByTeamId === myTeamId;
  const hasEvidence = (d.responderEvidenceUrls?.length ?? 0) > 0;
  if (!iRaised && !hasEvidence && d.status === 'open') return result('disputed', 'submit_evidence');
  return result('disputed', 'wait_staff');
}

export function deriveScrimNextAction(
  session: NextActionSession,
  myTeamId: string,
  now: number = Date.now(),
): ScrimNextAction {
  const iAmTeam1 = session.team1Id === myTeamId;
  switch (session.status) {
    case 'scheduled':
      return deriveScheduled(session, iAmTeam1, now);
    case 'in_progress':
      return deriveLive(session, iAmTeam1);
    case 'disputed':
      return deriveDisputed(session, myTeamId);
    case 'completed':
      return result('confirmed', 'none');
    case 'cancelled':
      return result('cancelled', 'none');
  }
}

