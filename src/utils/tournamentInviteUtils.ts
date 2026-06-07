export function getReservedInviteSlotsFromTournament(tournament: {
  reserved_invite_slots?: number;
  settings?: unknown;
} | null | undefined): number {
  if (!tournament) return 0;
  const settings = tournament.settings as { reservedInviteSlots?: number } | null | undefined;
  return tournament.reserved_invite_slots ?? settings?.reservedInviteSlots ?? 0;
}

export function getInviteExpiryDaysFromTournament(tournament: {
  invite_expiry_days?: number;
  settings?: unknown;
} | null | undefined): number {
  if (!tournament) return 7;
  const settings = tournament.settings as { inviteExpiryDays?: number } | null | undefined;
  return tournament.invite_expiry_days ?? settings?.inviteExpiryDays ?? 7;
}

export function defaultReservedInviteSlots(maxTeams: number): number {
  if (maxTeams <= 0) return 4;
  return Math.min(Math.max(2, Math.floor(maxTeams / 4)), maxTeams);
}

export function canConfigureInvitedTeams(teamSize: number, isBrTournament: boolean): boolean {
  return !isBrTournament && teamSize > 1;
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
