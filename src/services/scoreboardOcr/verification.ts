import { otherSlot } from './draft';
import type { OcrDraftPlayer, OcrVerification, RiotCheck, RiotStatus, TeamSlot, VerificationStatus, VerifiedPlayer } from '@/types/scoreboardOcr';

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
  username_only: { label: 'Matched by username', tone: 'neutral', hint: "Matched to an Esportra username; this player hasn't linked a Riot ID." },
  unconfirmed: { label: 'Name not readable', tone: 'check', hint: "The name couldn't be read, so it was matched to the team's remaining player." },
  edited: { label: 'Name changed', tone: 'check', hint: 'This name was changed from what the screenshot showed.' },
  other_team: { label: "On the other team's roster", tone: 'check', hint: 'This player is registered with the other team. Use the arrows to move them if they are on the wrong side.' },
  duplicate: { label: 'Listed twice', tone: 'check', hint: 'The same player appears on two rows.' },
  unknown: { label: 'Not on the roster', tone: 'check', hint: "This name isn't on either team's roster. Fix the spelling if it was misread; a substitute can stay as is." },
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

/**
 * One line when Riot's record backs the report. The background re-check (pending, not found,
 * unavailable) stays quiet: players only hear about it when it confirms something.
 */
export function riotCheckSummary(riot: RiotCheck | null | undefined): { text: string; tone: VerificationTone } | null {
  if (riot?.status !== 'confirmed') return null;
  return riot.autoAccepted
    ? { text: "Riot's record of the match confirms every player and number, so the result was accepted automatically.", tone: 'good' }
    : { text: "Checked against Riot's record of the match.", tone: 'good' };
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

/** Why a review row needs the captain's eye; null when it's fine. */
export type ReviewReason = 'not_on_roster' | 'other_team' | 'duplicate' | 'riot_account' | 'riot_missing' | 'riot_unlinked';

const RIOT_REASON: Partial<Record<RiotStatus, ReviewReason>> = {
  other_account: 'riot_account',
  not_in_match: 'riot_missing',
  unregistered: 'riot_unlinked',
};

/**
 * The row's reason as the captain edits. Their own fixes clear it: a renamed row (the server re-checks
 * it on send) and a row moved off the team it was read on.
 */
export function reviewReason(player: Pick<OcrDraftPlayer, 'name' | 'team'>, found: VerifiedPlayer | undefined): ReviewReason | null {
  const status = liveStatus(player.name, found);
  if (!found || !status || status === 'edited') return null;
  const riot = found.riotStatus ? RIOT_REASON[found.riotStatus] : undefined;
  if (riot) return riot;
  if (status === 'unknown') return 'not_on_roster';
  if (status === 'duplicate') return 'duplicate';
  if (status === 'other_team') return player.team === found.team ? 'other_team' : null;
  return null;
}

/** The short tag shown on the row, always visible. */
export function reviewTag(reason: ReviewReason, team: TeamSlot | null, teamNames: Record<TeamSlot, string>): string {
  switch (reason) {
    case 'not_on_roster':
      return 'Not on roster';
    case 'other_team':
      return `On ${teamNames[otherSlot(team ?? 'team2')]}'s roster`;
    case 'duplicate':
      return 'Listed twice';
    case 'riot_account':
      return 'Different Riot account';
    case 'riot_missing':
      return 'Not in the Riot match';
    case 'riot_unlinked':
      return 'Riot account not linked';
  }
}

const SUMMARY: Record<'not_on_roster' | 'other_team' | 'duplicate' | 'riot', (n: number) => string> = {
  not_on_roster: (n) =>
    `${n === 1 ? "1 name isn't" : `${n} names aren't`} on either team's roster. Fix the spelling if one was misread; a substitute can stay as is.`,
  other_team: (n) =>
    `${n === 1 ? '1 player is' : `${n} players are`} on the other team's roster. Use the swap button on the row if they're on the wrong side.`,
  duplicate: (n) => `${n === 1 ? '1 name appears' : `${n} names appear`} twice. Fix the one that was misread.`,
  riot: (n) => `${n === 1 ? "1 player's Riot account doesn't" : `${n} players' Riot accounts don't`} match the roster.`,
};

/** One plain sentence per reason, with counts, so the captain never has to open anything to learn why. */
export function reviewSummary(reasons: ReadonlyArray<ReviewReason | null>): string[] {
  const count = (match: (r: ReviewReason) => boolean) => reasons.filter((r): r is ReviewReason => r !== null && match(r)).length;
  const counts = {
    not_on_roster: count((r) => r === 'not_on_roster'),
    other_team: count((r) => r === 'other_team'),
    duplicate: count((r) => r === 'duplicate'),
    riot: count((r) => r.startsWith('riot_')),
  };
  return (Object.keys(SUMMARY) as Array<keyof typeof SUMMARY>).filter((k) => counts[k] > 0).map((k) => SUMMARY[k](counts[k]));
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
