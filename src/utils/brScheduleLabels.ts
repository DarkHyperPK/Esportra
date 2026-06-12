import type { BRStageFormat } from '@/types/battleRoyale';
import type { BRGame, BRRound } from '@/types/brLobbies';
import type { BRGroup } from '@/types/brGroups';
import {
  seedGroupShortLabel,
  formatRotationMatchdayLabel,
  formatRotationMatchLabel,
  resolveLobbyMatchupLabel,
  resolveMatchupLabelFromLobby,
} from '@/utils/brWaveScheduleDisplay';

export interface BRScheduleCopy {
  createAction: string;
  createPending: string;
  startTimesTitle: string;
  startTimesHint: string;
  emptyHint: string;
  autoDistribute: (count: number) => string;
  waveHeader: (waveNumber: number, count: number) => string;
  checklistCreate: string;
  checklistRun: string;
}

export function getBRScheduleCopy(format: BRStageFormat | string): BRScheduleCopy {
  if (format === 'group_rotation') {
    return {
      createAction: 'Create cross-group matches',
      createPending: 'Creating matches...',
      startTimesTitle: 'Match start times',
      startTimesHint: 'Set when each cross-group match goes live. Each match is one lobby with multiple scored games.',
      emptyHint: 'Create cross-group matches from the matchday schedule above first.',
      autoDistribute: (n) => `Auto-distribute across ${n} match${n === 1 ? '' : 'es'}`,
      waveHeader: (wave, n) => `${formatRotationMatchdayLabel(wave)} · ${n} match${n === 1 ? '' : 'es'}`,
      checklistCreate: 'Create cross-group matches from the matchday schedule below',
      checklistRun: 'Run matches in the Games tab (start lobby → play scored games → enter results)',
    };
  }

  if (format === 'single_lobby') {
    return {
      createAction: 'Create lobby & games',
      createPending: 'Creating lobby...',
      startTimesTitle: 'Lobby start time',
      startTimesHint: 'Set when the main lobby goes live. Create the lobby below or in the Games tab if it does not exist yet.',
      emptyHint: 'No lobby yet. Create the lobby and scored games, then set start times here.',
      autoDistribute: () => 'Set lobby start from stage window',
      waveHeader: (_wave, n) => `${n} lobby`,
      checklistCreate: 'Create lobby & games (button below, or Games tab)',
      checklistRun: 'Run games in the Games tab (start game → enter results)',
    };
  }

  // static_groups, multi_lobby_cut, default
  return {
    createAction: 'Create group lobbies',
    createPending: 'Creating lobbies...',
    startTimesTitle: 'Group lobby start times',
    startTimesHint: 'Each seed group plays in its own lobby. Create group lobbies first, then set start times.',
    emptyHint: 'No group lobbies yet. Create one lobby per group, then set start times here.',
    autoDistribute: (n) => `Auto-distribute across ${n} group lobby${n === 1 ? '' : 'ies'}`,
    waveHeader: (_wave, n) => `${n} group lobby${n === 1 ? '' : 'ies'}`,
    checklistCreate: 'Create group lobbies (one per seed group — button below, or Games tab)',
    checklistRun: 'Set manual start times per group and game below, then run games in the Games tab',
  };
}

export function resolveLobbyDisplayLabel(
  lobby: BRRound,
  groups: BRGroup[],
  format: BRStageFormat | string,
  rotationMatchup: string | null,
): string {
  if (format === 'group_rotation' && rotationMatchup) return rotationMatchup;
  if (format === 'single_lobby') return 'Main lobby';

  const groupId = lobby.group_ids?.[0];
  const group =
    (groupId ? groups.find((g) => g.id === groupId) : undefined)
    ?? groups[lobby.lobby_index ?? 0];

  if (group) {
    const short = seedGroupShortLabel(group.name);
    return short.toLowerCase().includes('lobby') ? short : `Group ${short} lobby`;
  }

  return `Group ${(lobby.lobby_index ?? 0) + 1} lobby`;
}

/** Games in the same lobby share a roster — scheduled starts must be strictly increasing. */
export function validateLobbyGameSchedules(
  games: BRGame[],
  gameSchedules: Record<string, string>,
): string | null {
  const sorted = [...games].sort((a, b) => a.game_number - b.game_number);
  const scheduled: { gameNumber: number; time: number }[] = [];

  for (const game of sorted) {
    const local = gameSchedules[game.id]?.trim();
    if (!local) continue;
    const time = new Date(local).getTime();
    if (Number.isNaN(time)) {
      return `Game ${game.game_number} has an invalid start time.`;
    }
    scheduled.push({ gameNumber: game.game_number, time });
  }

  for (let i = 1; i < scheduled.length; i += 1) {
    if (scheduled[i].time <= scheduled[i - 1].time) {
      return `In the same lobby, Game ${scheduled[i].gameNumber} must start after Game ${scheduled[i - 1].gameNumber} (teams play together sequentially).`;
    }
  }

  return null;
}

export function collectGameScheduleErrors(
  gamesByLobby: Record<string, BRGame[]>,
  gameSchedules: Record<string, string>,
): string[] {
  const errors: string[] = [];
  for (const games of Object.values(gamesByLobby)) {
    const err = validateLobbyGameSchedules(games, gameSchedules);
    if (err) errors.push(err);
  }
  return errors;
}

export function getPublicBRScheduleCopy(format: BRStageFormat | string | undefined): {
  isRotation: boolean;
  scheduleTitle: string;
  liveBannerPrefix: string;
} {
  const isRotation = format === 'group_rotation';
  return {
    isRotation,
    scheduleTitle: isRotation ? 'Your cross-group matches' : 'Game schedule',
    liveBannerPrefix: isRotation ? 'Cross-group match live' : 'Lobby live',
  };
}

export function formatPublicLobbyLabel(
  lobby: BRRound,
  opts: {
    format: BRStageFormat | string | undefined;
    groupName: string;
    lobbyIndex: number;
    totalLobbiesInGroup: number;
    seedGroupCount?: number;
    groups?: Array<{ id: string; name: string }>;
  },
): string {
  const { format, groupName, lobbyIndex, totalLobbiesInGroup, seedGroupCount = 0, groups = [] } = opts;
  if (format === 'group_rotation') {
    const matchday = lobby.wave_number ?? lobby.round_number ?? 1;
    if (groups.length >= 2) {
      return formatRotationMatchLabel(
        matchday,
        resolveMatchupLabelFromLobby(lobby, groups, null, seedGroupCount || groups.length),
      );
    }
    const matchup = resolveLobbyMatchupLabel(
      matchday,
      lobby.lobby_index ?? lobbyIndex,
      null,
      seedGroupCount,
    );
    if (matchup && matchup !== `Lobby ${(lobby.lobby_index ?? lobbyIndex) + 1}`) {
      return formatRotationMatchLabel(matchday, matchup);
    }
    const matchNum = (lobby.lobby_index ?? lobbyIndex) + 1;
    return `${formatRotationMatchdayLabel(matchday)} · Match ${matchNum}`;
  }

  const shortGroup = seedGroupShortLabel(groupName);
  if (totalLobbiesInGroup <= 1) {
    return `${shortGroup} lobby`;
  }
  return `${shortGroup} lobby ${lobbyIndex + 1}`;
}
