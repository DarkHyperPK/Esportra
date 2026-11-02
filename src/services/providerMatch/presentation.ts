import type { Tone } from '@/components/ui/kit/tone';
import type { ProviderMatchDetail } from '@/types/providerMatch';

export interface StatusPresentation {
  label: string;
  tone: Tone;
  /** One plain sentence: what this means for the result. */
  summary: string;
  /** Plain-language reasons the check did not fully pass. */
  details: string[];
}

const REASONS: Record<string, string> = {
  not_custom_game: 'The Riot match was not a custom game.',
  team1_split_across_sides: 'Players from the first team were on both sides of the Riot match.',
  team2_split_across_sides: 'Players from the second team were on both sides of the Riot match.',
  teams_on_same_side: 'Both teams were on the same side of the Riot match.',
  team1_score_mismatch: 'The first team’s score does not match the rounds Riot recorded.',
  team2_score_mismatch: 'The second team’s score does not match the rounds Riot recorded.',
  map_mismatch: 'The reported map is not the map Riot recorded.',
  match_incomplete: 'The Riot match had not finished when it was checked.',
  no_roster_account_in_match: 'None of the teams’ linked Riot accounts appear in this match.',
  no_linked_accounts: 'No player on either team has a linked Riot account, so Riot could not be asked.',
  match_already_used: 'This Riot match is already attached to another game.',
};

const UNMATCHED = /^unmatched_players:(\d+)$/;

/** Turns a server reason code into a sentence. Unknown codes never leak to the screen. */
export function reasonText(reason: string): string {
  const unmatched = UNMATCHED.exec(reason);
  if (unmatched) {
    const n = Number(unmatched[1]);
    return `${n} ${n === 1 ? 'player' : 'players'} could not be matched to a roster member.`;
  }
  return REASONS[reason] ?? 'One of the checks did not pass.';
}

function rosterLine(detail: ProviderMatchDetail): string {
  const players = detail.players ?? [];
  if (players.length === 0) return '';
  const matched = players.filter((p) => p.isRosterMember).length;
  return ` ${matched} of ${players.length} players matched a roster.`;
}

/** Null when no Riot match is attached: there is nothing to say. */
export function presentProviderMatch(detail: ProviderMatchDetail | undefined): StatusPresentation | null {
  if (!detail || detail.status === 'none') return null;
  const details = detail.reasons.map(reasonText);
  const data = detail.match?.dataStatus;

  switch (detail.status) {
    case 'verified':
      return { label: 'Verified by Riot', tone: 'success', summary: `Riot’s record of this match agrees with the reported result.${rosterLine(detail)}`, details: [] };
    case 'partially_verified':
      return { label: 'Partly verified', tone: 'warning', summary: `Riot’s record agrees with the result, but not every player could be matched to a roster.${rosterLine(detail)}`, details };
    case 'disputed':
      return { label: 'Differs from Riot', tone: 'critical', summary: 'Riot’s record of this match does not agree with what was reported. Staff can review it.', details };
    case 'duplicate':
      return { label: 'Riot match reused', tone: 'critical', summary: 'This Riot match is already attached to another game, so it is not counted here.', details: [] };
    case 'unverified':
      return { label: 'Not verified', tone: 'neutral', summary: 'Riot data could not confirm this result.', details };
    case 'pending':
      if (data === 'unavailable' || data === 'failed') {
        return { label: 'Riot data unavailable', tone: 'neutral', summary: 'Riot did not return this match, so the result stands as reported.', details: [] };
      }
      return { label: 'Checking with Riot', tone: 'neutral', summary: 'Riot can take a few minutes to list a custom game. This updates by itself.', details: [] };
    default:
      return null;
  }
}

/** Polling should stop once the server has nothing more to learn. */
export function isProviderMatchSettled(detail: ProviderMatchDetail | undefined): boolean {
  if (!detail) return false;
  if (detail.status !== 'pending') return true;
  return detail.match?.dataStatus === 'unavailable' || detail.match?.dataStatus === 'failed';
}
