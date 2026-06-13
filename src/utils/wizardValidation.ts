/** Field labels for tournament wizard validation toasts and banners. */
export const WIZARD_FIELD_LABELS: Record<string, string> = {
  name: 'Tournament name',
  game: 'Game',
  gameMode: 'Game mode',
  venue: 'Venue',
  region: 'Region',
  launchState: 'Launch state',
  startDate: 'Start date',
  startTime: 'Start time',
  endDate: 'End date',
  endTime: 'End time',
  maxTeams: 'Maximum participants',
  teamSize: 'Team size',
  mapPoolIds: 'Map pool',
  prizePool: 'Prize pool',
  entryFee: 'Entry fee',
  description: 'Description',
  discordUrl: 'Discord URL',
  twitterUrl: 'Twitter URL',
  streamUrl: 'Stream URL',
  rewards: 'Prize distribution',
  registrationOpens: 'Registration opens',
  registrationCloses: 'Registration closes',
  checkInWindowMinutes: 'Check-in window',
  reservedInviteSlots: 'Reserved invite slots',
  inviteExpiryDays: 'Invite expiry',
  _form: 'Form',
};

const STEP_FIELD_MAP: Record<number, string[]> = {
  1: ['name', 'game', 'gameMode', 'venue', 'region', 'launchState', 'startDate', 'startTime', 'endDate', 'endTime'],
  2: ['maxTeams', 'teamSize', 'mapPoolIds', 'brScoringPreset', 'brKillCap', 'brTiebreaker'],
  3: ['prizePool', 'entryFee', 'description', 'discordUrl', 'twitterUrl', 'streamUrl', 'rewards'],
  4: ['registrationOpens', 'registrationCloses', 'checkInWindowMinutes', 'reservedInviteSlots', 'inviteExpiryDays'],
};

function labelForField(key: string): string {
  return WIZARD_FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

/** Human-readable summary for validation toasts, e.g. "Start date is required · Maximum participants: Minimum 4 teams". */
export function summarizeWizardErrors(
  errors: Record<string, string>,
  limit = 3,
): string {
  const entries = Object.entries(errors).filter(([key, value]) => key !== '_form' && Boolean(value));
  if (entries.length === 0) {
    return errors._form ?? 'Please review the highlighted fields.';
  }

  const parts = entries.slice(0, limit).map(([key, message]) => {
    const label = labelForField(key);
    if (message.toLowerCase().includes(label.toLowerCase())) return message;
    return `${label}: ${message}`;
  });

  if (entries.length > limit) {
    parts.push(`+${entries.length - limit} more`);
  }

  return parts.join(' · ');
}

/** Earliest wizard step (1–4) that contains a field error; defaults to 6 (review) if unknown. */
export function firstWizardErrorStep(errors: Record<string, string>): number {
  const keys = new Set(Object.keys(errors).filter((k) => k !== '_form'));
  for (const step of [1, 2, 3, 4] as const) {
    const fields = STEP_FIELD_MAP[step] ?? [];
    if (fields.some((field) => keys.has(field))) return step;
  }
  return 6;
}
