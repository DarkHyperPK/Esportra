/** Active registration statuses excluded from BR seeding / check-in tallies. */
const INACTIVE_REGISTRATION_STATUSES = new Set([
  'rejected',
  'cancelled',
  'disqualified',
  'withdrawn',
]);

export function isActiveRegistration(status?: string | null): boolean {
  if (!status) return true;
  return !INACTIVE_REGISTRATION_STATUSES.has(status);
}

export function isParticipantCheckedIn(participant: {
  status?: string | null;
  checked_in_at?: string | null;
}): boolean {
  return participant.status === 'checked_in' || Boolean(participant.checked_in_at);
}

export function getBRSeedEligibleStatuses(checkInRequired: boolean): readonly string[] {
  return checkInRequired ? ['checked_in'] : ['approved', 'checked_in'];
}

export function countBRSeedEligibleParticipants(
  participants: Array<{ status?: string | null; checked_in_at?: string | null }> | null | undefined,
  checkInRequired: boolean,
): number {
  if (!participants?.length) return 0;

  return participants.filter((participant) => {
    if (!isActiveRegistration(participant.status)) return false;
    if (checkInRequired) return isParticipantCheckedIn(participant);
    return participant.status === 'approved' || participant.status === 'checked_in';
  }).length;
}

export function countCheckedInParticipants(
  participants: Array<{ status?: string | null; checked_in_at?: string | null }> | null | undefined,
): number {
  if (!participants?.length) return 0;
  return participants.filter(
    (participant) => isActiveRegistration(participant.status) && isParticipantCheckedIn(participant),
  ).length;
}

export function countPendingCheckInParticipants(
  participants: Array<{ status?: string | null; checked_in_at?: string | null }> | null | undefined,
): number {
  if (!participants?.length) return 0;
  return participants.filter(
    (participant) =>
      isActiveRegistration(participant.status)
      && !isParticipantCheckedIn(participant)
      && (participant.status === 'approved' || participant.status === 'pending'),
  ).length;
}

export function hasRegisteredParticipantsAwaitingCheckIn(
  participants: Array<{ status?: string | null; checked_in_at?: string | null }> | null | undefined,
): boolean {
  return countPendingCheckInParticipants(participants) > 0
    || (countBRSeedEligibleParticipants(participants, false) > 0
      && countBRSeedEligibleParticipants(participants, true) === 0);
}
