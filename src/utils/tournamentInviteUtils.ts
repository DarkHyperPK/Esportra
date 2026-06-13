import { evaluateRegistrationEligibility, isRegistrationStatusOpen } from '@/utils/tournamentLifecycle';

export function getReservedInviteSlotsFromTournament(tournament: {
  reserved_invite_slots?: number;
  reservedInviteSlots?: number;
  settings?: unknown;
} | null | undefined): number {
  if (!tournament) return 0;

  const settings = tournament.settings as { reservedInviteSlots?: number; reserved_invite_slots?: number } | null | undefined;
  const columnValue = tournament.reserved_invite_slots ?? tournament.reservedInviteSlots;
  const settingsValue = settings?.reservedInviteSlots ?? settings?.reserved_invite_slots;

  // Column 0 is valid (disabled) but when settings still hold slots, prefer settings
  // (wizard/dashboard may have written settings before the column synced).
  if (typeof columnValue === 'number' && columnValue > 0) return columnValue;
  if (typeof settingsValue === 'number' && settingsValue > 0) return settingsValue;
  if (typeof columnValue === 'number') return columnValue;
  return settingsValue ?? 0;
}

export function getInviteExpiryDaysFromTournament(tournament: {
  invite_expiry_days?: number;
  inviteExpiryDays?: number;
  settings?: unknown;
} | null | undefined): number {
  if (!tournament) return 7;
  const settings = tournament.settings as { inviteExpiryDays?: number } | null | undefined;
  return tournament.invite_expiry_days ?? tournament.inviteExpiryDays ?? settings?.inviteExpiryDays ?? 7;
}

export function defaultReservedInviteSlots(maxTeams: number): number {
  if (maxTeams <= 0) return 4;
  return Math.min(Math.max(2, Math.floor(maxTeams / 4)), maxTeams);
}

export function canConfigureInvitedTeams(_teamSize?: number, _isBrTournament?: boolean): boolean {
  return true;
}

export function getInviteParticipantLabel(teamSize: number): string {
  return teamSize > 1 ? 'teams' : 'players';
}

export function getInviteParticipantSingular(teamSize: number): string {
  return teamSize > 1 ? 'team' : 'player';
}

export interface TournamentRegistrationVisibilityInput {
  isOrganizer: boolean;
  isRegistered: boolean;
  registrationType?: string | null;
  reservedSlots: number;
  maxTeams: number;
  isPublic?: boolean;
  status?: string;
  registrationOpens?: string | Date | null;
  registrationDeadline?: string | Date | null;
  startDate?: string | Date | null;
}

export function getOpenRegistrationCapacity(maxTeams: number, reservedSlots: number): number | null {
  if (maxTeams <= 0) return null;
  if (reservedSlots <= 0) return maxTeams;
  return Math.max(maxTeams - reservedSlots, 0);
}

export function isTournamentRegistrationOpen(
  status?: string,
  timing?: {
    registrationOpens?: string | Date | null;
    registrationDeadline?: string | Date | null;
    startDate?: string | Date | null;
  },
): boolean {
  if (!isRegistrationStatusOpen(status)) return false;
  return evaluateRegistrationEligibility({
    status,
    registrationOpens: timing?.registrationOpens,
    registrationDeadline: timing?.registrationDeadline,
    startDate: timing?.startDate,
  }).allowed;
}

export function canShowInviteRedemption(input: TournamentRegistrationVisibilityInput): boolean {
  if (input.isOrganizer || input.isRegistered) return false;
  if (!isTournamentRegistrationOpen(input.status, {
    registrationOpens: input.registrationOpens,
    registrationDeadline: input.registrationDeadline,
    startDate: input.startDate,
  })) return false;
  const isInviteOnly = input.registrationType === 'invite_only';
  const isPrivate = input.isPublic === false;
  return isInviteOnly || input.reservedSlots > 0 || isPrivate;
}

export function canShowOpenRegistration(input: TournamentRegistrationVisibilityInput): boolean {
  if (input.isOrganizer || input.isRegistered) return false;
  if (input.isPublic === false) return false;
  if (input.registrationType === 'invite_only') return false;
  if (!isTournamentRegistrationOpen(input.status, {
    registrationOpens: input.registrationOpens,
    registrationDeadline: input.registrationDeadline,
    startDate: input.startDate,
  })) return false;

  const openCapacity = getOpenRegistrationCapacity(input.maxTeams, input.reservedSlots);
  if (input.reservedSlots > 0 && input.maxTeams > 0) {
    return openCapacity !== null && openCapacity > 0;
  }
  return true;
}

export function buildInviteSettingsPayload(
  enabled: boolean,
  reservedSlots: number,
  expiryDays: number,
  existingSettings: Record<string, unknown> = {},
) {
  const reservedInviteSlots = enabled ? reservedSlots : 0;
  const inviteExpiryDays = Math.min(365, Math.max(1, expiryDays));
  return {
    reservedInviteSlots,
    inviteExpiryDays,
    settings: {
      ...existingSettings,
      reservedInviteSlots,
      inviteExpiryDays,
    },
  };
}
