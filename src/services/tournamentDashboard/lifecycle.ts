/**
 * Lifecycle track for the tournament dashboard: where the event is right now
 * and what comes next.
 */
import type { TournamentDerivedPhase } from '@/utils/tournamentLifecycle';

export type LifecycleStepId = 'draft' | 'registration' | 'check_in' | 'live' | 'completed';
export type LifecycleStepState = 'done' | 'current' | 'upcoming';

export interface LifecycleStep {
  id: LifecycleStepId;
  label: string;
  state: LifecycleStepState;
}

export type PhaseTone = 'neutral' | 'accent' | 'success' | 'warning' | 'critical';

const STEP_LABELS: Record<LifecycleStepId, string> = {
  draft: 'Draft',
  registration: 'Registration',
  check_in: 'Check-in',
  live: 'Live',
  completed: 'Completed',
};

/** Promotes a registration phase to check-in while the check-in window is open. */
export function resolveDashboardPhase(
  phase: TournamentDerivedPhase,
  checkInWindowOpen: boolean,
): TournamentDerivedPhase {
  const isRegistrationPhase = phase === 'registration_open'
    || phase === 'registration_closed'
    || phase === 'registration_upcoming'
    || phase === 'closed';
  return isRegistrationPhase && checkInWindowOpen ? 'check_in' : phase;
}

function currentStepFor(phase: TournamentDerivedPhase): LifecycleStepId | null {
  switch (phase) {
    case 'draft':
      return 'draft';
    case 'check_in':
      return 'check_in';
    case 'live':
      return 'live';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return null;
    default:
      return 'registration';
  }
}

export function buildLifecycleSteps(
  phase: TournamentDerivedPhase,
  checkInRequired: boolean,
): LifecycleStep[] {
  const ids: LifecycleStepId[] = checkInRequired || phase === 'check_in'
    ? ['draft', 'registration', 'check_in', 'live', 'completed']
    : ['draft', 'registration', 'live', 'completed'];
  const current = currentStepFor(phase);
  const currentIndex = current ? ids.indexOf(current) : -1;

  return ids.map((id, index) => {
    let state: LifecycleStepState = 'upcoming';
    if (currentIndex >= 0 && index < currentIndex) state = 'done';
    if (index === currentIndex) state = phase === 'completed' ? 'done' : 'current';
    return { id, label: STEP_LABELS[id], state };
  });
}

export function phaseTone(phase: TournamentDerivedPhase): PhaseTone {
  switch (phase) {
    case 'registration_open':
      return 'success';
    case 'registration_upcoming':
    case 'registration_closed':
      return 'warning';
    case 'check_in':
    case 'live':
      return 'accent';
    case 'cancelled':
      return 'critical';
    default:
      return 'neutral';
  }
}
