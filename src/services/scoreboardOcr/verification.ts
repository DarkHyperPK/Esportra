import type { OcrVerification, TeamSlot, VerificationStatus, VerifiedPlayer } from '@/types/scoreboardOcr';

export type VerificationTone = 'good' | 'neutral' | 'check';

/** Neutral wording: these describe a lookup, they don't accuse anyone. */
export const VERIFICATION_LABELS: Record<VerificationStatus, { label: string; tone: VerificationTone }> = {
  verified: { label: 'Riot ID verified', tone: 'good' },
  claimed: { label: 'Riot ID not verified', tone: 'neutral' },
  username_only: { label: 'Matched by username', tone: 'neutral' },
  unconfirmed: { label: 'Name not readable', tone: 'check' },
  edited: { label: 'Name changed', tone: 'check' },
  other_team: { label: "On the other team's roster", tone: 'check' },
  duplicate: { label: 'Listed twice', tone: 'check' },
  unknown: { label: 'Not on the roster', tone: 'check' },
};

const REVIEW: ReadonlySet<VerificationStatus> = new Set(['unknown', 'other_team', 'duplicate', 'edited']);

/** Same comparison key as the API and the OCR service: case, spacing and look-alikes ignored. */
export function nameKey(name: string): string {
  const folded: Record<string, string> = { o: '0', l: '1', i: '1', s: '5', z: '2' };
  return name
    .split('#')[0]
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .replace(/[olisz]/g, (ch) => folded[ch]);
}

/** Players the opponent and organizers should look at. */
export function needsReview(verification: OcrVerification | null | undefined): VerifiedPlayer[] {
  return verification?.players.filter((p) => REVIEW.has(p.status)) ?? [];
}

/** While the captain edits: a changed name shows as "Name changed" until the server re-checks it. */
export function liveStatus(currentName: string, verified: VerifiedPlayer | undefined): VerificationStatus | null {
  if (!verified) return null;
  return nameKey(currentName) !== nameKey(verified.name) ? 'edited' : verified.status;
}

function describe(player: VerifiedPlayer, teamNames: Record<TeamSlot, string>): string {
  switch (player.status) {
    case 'other_team':
      return `${player.name} (on ${player.team === 'team1' ? teamNames.team2 : teamNames.team1}'s roster)`;
    case 'duplicate':
      return `${player.name} (listed twice)`;
    case 'edited':
      return `${player.name} (the screenshot showed "${player.readName ?? '?'}")`;
    default:
      return `${player.name} (not on either roster)`;
  }
}

/** Pre-filled dispute text for the opponent; they can edit it before sending. */
export function disputeReasonFor(verification: OcrVerification | null | undefined, teamNames: Record<TeamSlot, string>): string {
  const players = needsReview(verification);
  const lines = players.length ? [`Players to check on the scoreboard: ${players.map((p) => describe(p, teamNames)).join(', ')}.`] : [];
  if (verification?.flags.includes('screenshot_reused')) lines.push('The same screenshot was used for another match.');
  if (verification?.flags.includes('date_mismatch')) lines.push('The date on the screenshot does not match this match.');
  return lines.join(' ');
}
