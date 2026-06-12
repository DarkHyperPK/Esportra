import type {
  BRAdvancementConfig,
  BRStageConfig,
  BRStageFormat,
  BRLobbyFormationConfig,
} from '@/types/battleRoyale';

export interface BuildProStageConfigInput {
  format: BRStageFormat;
  groupCount: number;
  lobbySize: number | null;
  advancementPerGroup: number | null;
  isFinal: boolean;
  gameCount?: number;
}

export function buildProStageConfig(input: BuildProStageConfigInput): { br: BRStageConfig } {
  const advancement: BRAdvancementConfig | null = input.isFinal
    ? { mode: 'none' }
    : input.format === 'multi_lobby_cut'
      ? {
          mode: 'top_n_per_lobby',
          perLobby: input.advancementPerGroup ?? undefined,
        }
      : input.format === 'group_rotation'
        ? {
            mode: 'top_n_overall',
            overall: input.advancementPerGroup ?? undefined,
          }
        : {
            mode: 'top_n_per_group',
            perGroup: input.advancementPerGroup ?? undefined,
          };

  const leaderboardScope =
    input.format === 'single_lobby' || input.format === 'group_rotation'
      ? 'stage_global'
      : input.format === 'multi_lobby_cut'
        ? 'per_lobby'
        : 'per_seed_group';

  let lobbyFormation: BRLobbyFormationConfig | null = null;
  if (input.format === 'single_lobby') {
    lobbyFormation = { mode: 'single' };
  } else if (input.format === 'group_rotation') {
    lobbyFormation = {
      mode: 'rotating_pairwise',
      seedGroupCount: input.groupCount,
      groupsPerLobby: 2,
      matchesPerWave: 1,
      matchupSchedule: 'auto',
    };
  } else {
    lobbyFormation = {
      mode: 'parallel_fixed',
      lobbyCount: input.groupCount,
      lobbySize: input.lobbySize ?? undefined,
    };
  }

  const br: BRStageConfig = {
    format: input.format,
    leaderboardScope,
    advancement,
    lobbyFormation,
  };

  if (input.gameCount != null && input.gameCount > 0) {
    br.gamesPerLobby = input.gameCount;
    br.gameCount = input.gameCount;
  }

  return { br };
}

export function resolveFormatFromWizard(params: {
  lobbyLayout: 'single_lobby' | 'split_groups';
  splitFormation: 'parallel' | 'rotation';
  registeredUnits: number;
  maxLobbySize: number | null;
}): BRStageFormat {
  if (params.lobbyLayout === 'single_lobby') {
    return 'single_lobby';
  }
  if (params.splitFormation === 'rotation') {
    return 'group_rotation';
  }
  if (params.maxLobbySize != null && params.registeredUnits > params.maxLobbySize * 4) {
    return 'multi_lobby_cut';
  }
  return 'static_groups';
}
