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
