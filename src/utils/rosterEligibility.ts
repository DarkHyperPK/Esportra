import {
  getDefaultGameMode,
  getGameMode,
  getParticipantMode,
  getRosterLimits,
  isSkirmishGameMode,
} from '@/utils/gameFeatures';

export type RosterLineupRole = 'starter' | 'substitute' | 'coach';

export interface RosterMatchInput {
  game?: string | null;
  format?: string | null;
  team_size?: number | null;
}

export interface RosterMemberRoleInput {
  roster_role?: string | null;
  is_starter?: boolean | null;
}

export interface TournamentLineupEntry {
  userId: string;
  displayName: string;
}

export interface TournamentLineupPayload {
  starters: TournamentLineupEntry[];
  substitutes: TournamentLineupEntry[];
  coaches: TournamentLineupEntry[];
}

const normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase();

/** Team Skirmish modes pick starters/subs from the game's default roster pool at registration. */
export function usesTournamentLineupSelection(gameName: string, modeKey?: string | null): boolean {
  const key = normalize(modeKey);
  if (key.includes('skirmish') && !key.includes('1v1')) return true;
  if (key.includes('2v2') && getParticipantMode(gameName, modeKey) === 'team') return true;
  return isSkirmishGameMode(gameName, modeKey) && getParticipantMode(gameName, modeKey) === 'team';
}

/** Default catalog mode key used as the player pool (e.g. Valorant 5v5). */
export function getRosterPoolModeKey(gameName: string, modeKey?: string | null): string | null {
  if (!usesTournamentLineupSelection(gameName, modeKey)) return null;
  const defaultMode = getDefaultGameMode(gameName);
  if (defaultMode) return defaultMode.key || defaultMode.value;
  return '5v5';
}

export function resolveMemberRosterRole(member: RosterMemberRoleInput): RosterLineupRole {
  if (member.roster_role === 'starter' || member.roster_role === 'substitute' || member.roster_role === 'coach') {
    return member.roster_role;
  }
  return member.is_starter === false ? 'substitute' : 'starter';
}

export function countRosterPlayers(members: RosterMemberRoleInput[]): number {
  return members.filter((member) => {
    const role = resolveMemberRosterRole(member);
    return role === 'starter' || role === 'substitute';
  }).length;
}

/** Whether a team roster can be used for this tournament (exact mode or Skirmish pool mode). */
export function rosterMatchesTournament(
  roster: RosterMatchInput,
  gameName: string,
  modeKey?: string | null,
): boolean {
  const rosterGame = normalize(roster.game);
  const tournamentGame = normalize(gameName);
  if (!rosterGame || rosterGame !== tournamentGame) return false;

  if (!modeKey) return true;

  const rosterFormat = normalize(roster.format);
  if (!rosterFormat) return true;

  if (rosterFormat === normalize(modeKey)) return true;

  const poolModeKey = getRosterPoolModeKey(gameName, modeKey);
  if (!poolModeKey) return false;

  if (rosterFormat === normalize(poolModeKey)) return true;

  const poolMode = getGameMode(gameName, poolModeKey);
  if (poolMode?.aliases?.some((alias) => normalize(alias) === rosterFormat)) return true;
  if (normalize(poolMode?.value) === rosterFormat) return true;

  return false;
}

export type TournamentLineupSelection = Record<string, 'starter' | 'substitute' | null>;

export function validateTournamentLineupSelection(
  selections: TournamentLineupSelection,
  gameName: string,
  modeKey?: string | null,
): { valid: boolean; error?: string } {
  const limits = getRosterLimits(gameName, modeKey);
  const starters = Object.values(selections).filter((role) => role === 'starter').length;
  const substitutes = Object.values(selections).filter((role) => role === 'substitute').length;
  const players = starters + substitutes;

  if (starters !== limits.starters) {
    return {
      valid: false,
      error: `Select exactly ${limits.starters} starter${limits.starters === 1 ? '' : 's'}.`,
    };
  }
  if (substitutes > limits.maxSubstitutes) {
    return {
      valid: false,
      error: `Select at most ${limits.maxSubstitutes} substitute${limits.maxSubstitutes === 1 ? '' : 's'}.`,
    };
  }
  if (players > limits.maxRoster) {
    return {
      valid: false,
      error: `Select at most ${limits.maxRoster} players for this mode.`,
    };
  }
  if (players === 0) {
    return { valid: false, error: 'Select players for this tournament lineup.' };
  }

  return { valid: true };
}

export function buildRosterLineupPayload(
  members: Array<{ user_id: string }>,
  selections: TournamentLineupSelection,
  displayNames: Map<string, string>,
): TournamentLineupPayload {
  const resolveName = (userId: string) => displayNames.get(userId) || userId;

  const starters = members
    .filter((member) => selections[member.user_id] === 'starter')
    .map((member) => ({ userId: member.user_id, displayName: resolveName(member.user_id) }));

  const substitutes = members
    .filter((member) => selections[member.user_id] === 'substitute')
    .map((member) => ({ userId: member.user_id, displayName: resolveName(member.user_id) }));

  return { starters, substitutes, coaches: [] };
}
