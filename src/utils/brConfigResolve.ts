import type {
  BRAdvancementConfig,
  BRMapConfig,
  BRMapMode,
  BRScoringPreset,
  BRStageConfig,
  BRTiebreaker,
  ResolvedStageBRConfig,
} from '@/types/battleRoyale';
import type { BRLeaderboardEntry } from '@/types/battleRoyale';
import { getBRConfig, gameHasBRMaps, getBRMapPool } from '@/utils/gameFeatures';

type StageLike = {
  capacity?: number | null;
  advancement_count?: number | null;
  config?: unknown;
};

type TournamentSettingsLike = Record<string, unknown> | null | undefined;

const DEFAULT_PLACEMENTS: BRScoringPreset = {
  name: 'Default',
  placements: [10, 6, 5, 4, 3, 2, 1, 1],
  killPoints: 1,
  killCap: null,
};

export function parseStageConfig(stage: StageLike): Record<string, unknown> {
  if (!stage.config) return {};
  if (typeof stage.config === 'string') {
    try {
      return JSON.parse(stage.config) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return stage.config as Record<string, unknown>;
}

export function getStageBRConfig(stage: StageLike): BRStageConfig | null {
  const root = parseStageConfig(stage);
  const br = root.br;
  if (!br || typeof br !== 'object') return null;
  return br as BRStageConfig;
}

function resolveScoringPreset(
  gameName: string,
  settings: TournamentSettingsLike,
  stageOverride: BRStageConfig | null,
): BRScoringPreset {
  const catalog = getBRConfig(gameName);
  const stageScoring = stageOverride?.scoring;

  if (stageScoring?.custom) {
    return stageScoring.custom;
  }

  const presetKey =
    stageScoring?.presetKey
    ?? (typeof settings?.brScoringPreset === 'string' ? settings.brScoringPreset : null)
    ?? catalog?.defaultPreset
    ?? 'custom';

  if (presetKey === 'custom' && settings?.brCustomScoring) {
    return settings.brCustomScoring as BRScoringPreset;
  }

  return catalog?.scoringPresets?.[presetKey] ?? DEFAULT_PLACEMENTS;
}

function resolveKillCap(
  settings: TournamentSettingsLike,
  stageOverride: BRStageConfig | null,
  preset: BRScoringPreset,
): number | null {
  if (stageOverride?.scoring?.killCap !== undefined && stageOverride.scoring.killCap !== null) {
    return stageOverride.scoring.killCap;
  }
  if (settings?.brKillCap !== undefined && settings.brKillCap !== null) {
    return settings.brKillCap as number;
  }
  return preset.killCap;
}

function resolveMapConfig(
  gameName: string,
  settings: TournamentSettingsLike,
  stageOverride: BRStageConfig | null,
): BRMapConfig {
  const catalog = getBRConfig(gameName);
  const catalogPool = getBRMapPool(gameName);
  const hasMaps = gameHasBRMaps(gameName);

  const defaultMode: BRMapMode = hasMaps
    ? (settings?.brDefaultMapMode as BRMapMode)
      ?? catalog?.defaultMapMode
      ?? 'per_round'
    : 'none';

  const stageMap = stageOverride?.map;
  const mode: BRMapMode = hasMaps
    ? (stageMap?.mode ?? defaultMode)
    : 'none';

  const pool = (stageMap?.pool?.length ? stageMap.pool : catalogPool).filter(Boolean);
  const fixedMap = stageMap?.fixedMap ?? (pool[0] ?? null);

  return { mode, pool, fixedMap };
}

function resolveAdvancement(
  stage: StageLike,
  stageOverride: BRStageConfig | null,
): BRAdvancementConfig | null {
  const fromConfig = stageOverride?.advancement;
  if (fromConfig?.mode === 'top_n_overall') {
    return {
      mode: 'top_n_overall',
      overall: fromConfig.overall ?? stage.advancement_count ?? undefined,
    };
  }

  if (fromConfig?.mode === 'top_n_per_group' || fromConfig?.perGroup != null) {
    return {
      mode: 'top_n_per_group',
      perGroup: fromConfig.perGroup ?? stage.advancement_count ?? undefined,
    };
  }

  if (stage.advancement_count != null && stage.advancement_count > 0) {
    return {
      mode: 'top_n_per_group',
      perGroup: stage.advancement_count,
    };
  }

  return null;
}

export function resolveStageBRConfig(params: {
  gameName: string;
  settings?: TournamentSettingsLike;
  stage: StageLike;
  teamSize?: number;
}): ResolvedStageBRConfig {
  const { gameName, settings, stage, teamSize = 1 } = params;
  const catalog = getBRConfig(gameName);
  const stageOverride = getStageBRConfig(stage);

  const scoringPreset = resolveScoringPreset(gameName, settings, stageOverride);
  const killCap = resolveKillCap(settings, stageOverride, scoringPreset);

  const tiebreaker = (settings?.brTiebreaker as BRTiebreaker) ?? 'most_wins';

  const gameCount =
    stageOverride?.gameCount
    ?? (typeof settings?.brDefaultGameCount === 'number' ? settings.brDefaultGameCount : null)
    ?? (typeof settings?.brGameCount === 'number' ? settings.brGameCount : null)
    ?? catalog?.defaultGameCount
    ?? 6;

  const defaultLobbyUnits = typeof settings?.brDefaultLobbySize === 'number'
    ? settings.brDefaultLobbySize
    : catalog
      ? Math.floor(catalog.playersPerLobby / Math.max(1, teamSize))
      : 20;

  const lobbySize = stage.capacity ?? defaultLobbyUnits;

  return {
    scoringPreset,
    killCap,
    tiebreaker,
    gameCount,
    lobbySize: stage.capacity === undefined ? defaultLobbyUnits : stage.capacity,
    advancement: resolveAdvancement(stage, stageOverride),
    map: resolveMapConfig(gameName, settings, stageOverride),
  };
}

export function resolveMapForRound(
  mapConfig: BRMapConfig,
  roundNumber: number,
  explicitMap?: string | null,
): string | null {
  if (mapConfig.mode === 'none') return null;
  if (explicitMap) return explicitMap;

  switch (mapConfig.mode) {
    case 'fixed_stage':
      return mapConfig.fixedMap;
    case 'rotation':
      if (mapConfig.pool.length === 0) return null;
      return mapConfig.pool[(roundNumber - 1) % mapConfig.pool.length];
    case 'per_round':
      return null;
    default: {
      const _exhaustive: never = mapConfig.mode;
      return _exhaustive;
    }
  }
}

export function getQualificationCutoff(
  resolved: ResolvedStageBRConfig,
  _groupsCount = 1,
): number | undefined {
  const adv = resolved.advancement;
  if (!adv) return undefined;

  if (adv.mode === 'top_n_per_group' && adv.perGroup && adv.perGroup > 0) {
    return adv.perGroup;
  }

  if (adv.mode === 'top_n_overall' && adv.overall && adv.overall > 0) {
    return adv.overall;
  }

  return undefined;
}

function averagePlacement(entry: Pick<BRLeaderboardEntry, 'perGameResults' | 'gamesPlayed' | 'bestPlacement'>): number {
  const results = entry.perGameResults ?? [];
  if (results.length > 0) {
    return results.reduce((sum, r) => sum + r.placement, 0) / results.length;
  }
  if (entry.gamesPlayed > 0 && entry.bestPlacement > 0) {
    return entry.bestPlacement;
  }
  return Number.POSITIVE_INFINITY;
}

export function compareBRLeaderboardEntries(
  a: Pick<BRLeaderboardEntry, 'totalPoints' | 'wins' | 'totalKills' | 'bestPlacement' | 'gamesPlayed' | 'perGameResults'>,
  b: Pick<BRLeaderboardEntry, 'totalPoints' | 'wins' | 'totalKills' | 'bestPlacement' | 'gamesPlayed' | 'perGameResults'>,
  tiebreaker: BRTiebreaker,
): number {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;

  switch (tiebreaker) {
    case 'most_wins': {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
      return averagePlacement(a) - averagePlacement(b);
    }
    case 'most_kills': {
      if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return averagePlacement(a) - averagePlacement(b);
    }
    case 'head_to_head': {
      const placementDiff = averagePlacement(a) - averagePlacement(b);
      if (placementDiff !== 0) return placementDiff;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.totalKills - a.totalKills;
    }
    default: {
      const _exhaustive: never = tiebreaker;
      return _exhaustive;
    }
  }
}

export function sortBRLeaderboardEntries(
  entries: BRLeaderboardEntry[],
  tiebreaker: BRTiebreaker,
): BRLeaderboardEntry[] {
  return [...entries].sort((a, b) => compareBRLeaderboardEntries(a, b, tiebreaker));
}
