import type { TournamentStatus } from '@/types/tournament';

/** Statuses that accept new registrations (open + invite redemption). */
export const REGISTRATION_ACCEPTING_STATUSES: readonly TournamentStatus[] = [
  'published',
  'open',
] as const;

export function parseTournamentInstant(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format for `<input type="datetime-local" />` in the user's local timezone. */
export function toLocalDateTimeInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

export function getRegistrationOpensFromSettings(settings: unknown): Date | null {
  const s = settings as { registrationOpensAt?: string } | null | undefined;
  return parseTournamentInstant(s?.registrationOpensAt);
}

function isStoredUtcMidnight(d: Date): boolean {
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

/**
 * Last moment registration is allowed.
 * Midnight UTC deadlines (as stored by the API) are inclusive through 23:59:59.999 UTC
 * on that calendar day. Specific times use the exact instant from the organizer.
 */
export function getRegistrationDeadlineEnd(
  registrationDeadline: string | Date | null | undefined,
): Date | null {
  const d = parseTournamentInstant(registrationDeadline);
  if (!d) return null;

  if (isStoredUtcMidnight(d)) {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
    );
  }

  return d;
}

export function isRegistrationDeadlineOpen(
  registrationDeadline: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  const end = getRegistrationDeadlineEnd(registrationDeadline);
  if (!end) return true;
  return now.getTime() <= end.getTime();
}

export function isRegistrationOpensReached(
  registrationOpens: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  const opens = parseTournamentInstant(registrationOpens);
  if (!opens) return true;
  return now.getTime() >= opens.getTime();
}

export function isRegistrationStatusOpen(status?: string | null): boolean {
  if (!status) return false;
  return REGISTRATION_ACCEPTING_STATUSES.includes(status as TournamentStatus);
}

export function hasTournamentStarted(
  startDate: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  const start = parseTournamentInstant(startDate);
  if (!start) return false;
  return now.getTime() >= start.getTime();
}

export type RegistrationEligibility = {
  allowed: boolean;
  reason?: string;
};

export function evaluateRegistrationEligibility(input: {
  status?: string | null;
  registrationOpens?: string | Date | null;
  registrationDeadline?: string | Date | null;
  startDate?: string | Date | null;
  now?: Date;
}): RegistrationEligibility {
  const now = input.now ?? new Date();

  if (!isRegistrationStatusOpen(input.status)) {
    return {
      allowed: false,
      reason: 'Tournament is not accepting registrations.',
    };
  }

  if (!isRegistrationOpensReached(input.registrationOpens, now)) {
    return {
      allowed: false,
      reason: 'Registration has not opened yet.',
    };
  }

  if (!isRegistrationDeadlineOpen(input.registrationDeadline, now)) {
    return {
      allowed: false,
      reason: 'Registration deadline has passed.',
    };
  }

  if (hasTournamentStarted(input.startDate, now)) {
    return {
      allowed: false,
      reason: 'Tournament has already started.',
    };
  }

  return { allowed: true };
}

export type TournamentDerivedPhase =
  | 'draft'
  | 'registration_upcoming'
  | 'registration_open'
  | 'registration_closed'
  | 'check_in'
  | 'live'
  | 'completed'
  | 'cancelled'
  | 'closed';

const DERIVED_PHASE_LABELS: Record<TournamentDerivedPhase, string> = {
  draft: 'DRAFT',
  registration_upcoming: 'REGISTRATION OPENS SOON',
  registration_open: 'REGISTRATION OPEN',
  registration_closed: 'REGISTRATION CLOSED',
  check_in: 'CHECK-IN',
  live: 'LIVE',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  closed: 'CLOSED',
};

export function deriveTournamentPhase(input: {
  status?: string | null;
  registrationOpens?: string | Date | null;
  registrationDeadline?: string | Date | null;
  startDate?: string | Date | null;
  now?: Date;
}): TournamentDerivedPhase {
  const status = (input.status ?? '').toLowerCase();
  const now = input.now ?? new Date();

  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'completed';
  if (status === 'ongoing') return 'live';
  if (status === 'check_in') return 'check_in';
  if (status === 'draft') return 'draft';
  if (status === 'closed') return 'closed';

  if (!isRegistrationOpensReached(input.registrationOpens, now)) {
    return 'registration_upcoming';
  }

  if (!isRegistrationDeadlineOpen(input.registrationDeadline, now)) {
    return hasTournamentStarted(input.startDate, now) ? 'live' : 'registration_closed';
  }

  if (hasTournamentStarted(input.startDate, now)) {
    return 'live';
  }

  if (isRegistrationStatusOpen(status)) {
    return 'registration_open';
  }

  return 'closed';
}

export function getDerivedPhaseLabel(phase: TournamentDerivedPhase): string {
  return DERIVED_PHASE_LABELS[phase];
}

export function getDerivedPhaseColorClass(phase: TournamentDerivedPhase): string {
  switch (phase) {
    case 'registration_open':
      return 'text-emerald-400';
    case 'registration_upcoming':
    case 'registration_closed':
      return 'text-amber-400';
    case 'check_in':
      return 'text-violet-400';
    case 'live':
      return 'text-red-400';
    case 'completed':
      return 'text-zinc-400';
    case 'cancelled':
      return 'text-rose-400';
    case 'draft':
    case 'closed':
    default:
      return 'text-gray-400';
  }
}

export function getCheckInWindowMinutes(settings: unknown): number {
  const mins = Number((settings as { checkInWindowMinutes?: number } | null)?.checkInWindowMinutes);
  if (Number.isFinite(mins) && mins >= 5) return mins;
  return 30;
}

export interface CheckInWindow {
  opensAt: Date | null;
  closesAt: Date | null;
  windowMinutes: number;
}

/**
 * Check-in opens `checkInWindowMinutes` before tournament start and closes at start.
 * Uses start_date + settings as source of truth (matches wizard copy).
 */
export function resolveCheckInWindow(params: {
  startDate?: string | Date | null;
  checkInDeadline?: string | Date | null;
  settings?: unknown;
}): CheckInWindow {
  const windowMinutes = getCheckInWindowMinutes(params.settings);
  const start = parseTournamentInstant(params.startDate);

  if (!start) {
    return {
      opensAt: null,
      closesAt: parseTournamentInstant(params.checkInDeadline),
      windowMinutes,
    };
  }

  return {
    opensAt: new Date(start.getTime() - windowMinutes * 60_000),
    closesAt: start,
    windowMinutes,
  };
}

export function isCheckInOpen(
  window: Pick<CheckInWindow, 'opensAt' | 'closesAt'>,
  now: Date = new Date(),
): boolean {
  if (!window.opensAt || !window.closesAt) return false;
  const t = now.getTime();
  return t >= window.opensAt.getTime() && t <= window.closesAt.getTime();
}

export function hasCheckInClosed(
  window: Pick<CheckInWindow, 'closesAt'>,
  now: Date = new Date(),
): boolean {
  if (!window.closesAt) return false;
  return now.getTime() > window.closesAt.getTime();
}

export function hasCheckInNotOpenedYet(
  window: Pick<CheckInWindow, 'opensAt'>,
  now: Date = new Date(),
): boolean {
  if (!window.opensAt) return false;
  return now.getTime() < window.opensAt.getTime();
}
