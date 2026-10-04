import type { OcrVerification, RiotCheck, RiotStatus, TeamSlot, VerificationStatus, VerifiedPlayer } from '@/types/scoreboardOcr';

export type VerificationTone = 'good' | 'neutral' | 'check';

export interface VerificationLabel {
  label: string;
  tone: VerificationTone;
  hint?: string;
}

const NO_TAG_HINT = "Scoreboards don't show the #tag, so a name alone isn't proof. It's confirmed once Riot's record of the match is found.";

/** Neutral wording: these describe a lookup, they don't accuse anyone. */
export const VERIFICATION_LABELS: Record<VerificationStatus, VerificationLabel> = {
  verified: { label: 'Name matches Riot ID', tone: 'neutral', hint: NO_TAG_HINT },
  claimed: { label: 'Name matches typed Riot ID', tone: 'neutral', hint: NO_TAG_HINT },
  username_only: { label: 'Matched by username', tone: 'neutral' },
  unconfirmed: { label: 'Name not readable', tone: 'check' },
  edited: { label: 'Name changed', tone: 'check' },
  other_team: { label: "On the other team's roster", tone: 'check' },
  duplicate: { label: 'Listed twice', tone: 'check' },
  unknown: { label: 'Not on the roster', tone: 'check' },
};

/** From Riot's own record of the match, by account (PUUID): this is the proof a screenshot can't give. */
export const RIOT_LABELS: Record<RiotStatus, VerificationLabel> = {
  confirmed: { label: 'Riot ID confirmed', tone: 'good', hint: "This player's linked Riot account played this match." },
  other_account: { label: 'Different Riot account', tone: 'check', hint: 'A different account with the same name played this match.' },
  not_in_match: { label: 'Not in the Riot match', tone: 'check', hint: "This player's linked Riot account isn't in Riot's record of the match." },
  unregistered: { label: 'Not registered', tone: 'check', hint: "The account that played isn't linked to anyone on either roster." },
};

const REVIEW: ReadonlySet<VerificationStatus> = new Set(['unknown', 'other_team', 'duplicate', 'edited']);
const RIOT_REVIEW: ReadonlySet<RiotStatus> = new Set(['other_account', 'not_in_match', 'unregistered']);

/** The badge for a row: Riot's check when there is one, else the screenshot's name match. */
export function badgeFor(player: Pick<VerifiedPlayer, 'status' | 'riotStatus'>): VerificationLabel {
  return player.riotStatus ? RIOT_LABELS[player.riotStatus] : VERIFICATION_LABELS[player.status];
}

/** One line on where the Riot check of a report stands. */
export function riotCheckSummary(riot: RiotCheck | null | undefined): { text: string; tone: VerificationTone } | null {
  switch (riot?.status) {
    case 'confirmed':
      return { text: "Checked against Riot's record of the match.", tone: 'good' };
    case 'pending':
      return { text: 'Looking for this game in Riot match history…', tone: 'neutral' };
    case 'not_found':
      return { text: "Riot's record of this game wasn't found. Names were checked from the screenshot only.", tone: 'check' };
    case 'unavailable':
      return { text: 'Riot match data is unavailable. Names were checked from the screenshot only.', tone: 'neutral' };
    default:
      return null;
  }
}

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
  return verification?.players.filter((p) => REVIEW.has(p.status) || (p.riotStatus != null && RIOT_REVIEW.has(p.riotStatus))) ?? [];
}

/** While the captain edits: a changed name shows as "Name changed" until the server re-checks it. */
export function liveStatus(currentName: string, verified: VerifiedPlayer | undefined): VerificationStatus | null {
  if (!verified) return null;
  return nameKey(currentName) !== nameKey(verified.name) ? 'edited' : verified.status;
}

function describe(player: VerifiedPlayer, teamNames: Record<TeamSlot, string>): string {
  switch (player.riotStatus) {
    case 'other_account':
      return `${player.name} (a different Riot account played: ${player.riotId ?? 'unknown'})`;
    case 'not_in_match':
      return `${player.name} (linked Riot account not in the match)`;
    case 'unregistered':
      return `${player.riotId ?? player.name} (not linked to either roster)`;
    default:
      break;
  }
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
  if (verification?.flags.includes('score_mismatch')) lines.push("The submitted score differs from Riot's record of the match.");
  if (verification?.flags.includes('stats_mismatch')) {
    const edited = verification.players.filter((p) => p.riotKda).map((p) => `${p.name} (Riot: ${p.riotKda})`);
    lines.push(`Submitted K/D/A differs from Riot's record${edited.length ? `: ${edited.join(', ')}` : ''}.`);
  }
  return lines.join(' ');
}
