import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type {
  BRAdvancementConfig,
  BRAdvancementMode,
  BRLeaderboardScope,
  BRMapConfig,
  BRMapMode,
  BRScoringPreset,
  BRStageFormat,
  BRTiebreaker,
  ResolvedStageBRConfig,
} from '@/types/battleRoyale';
import { resolveStageBRConfig } from '@/utils/brConfigResolve';

/** API response from GET /api/stages/{stageId}/br/config */
export interface ResolvedBrStageConfigApi {
  gamesPerLobby: number;
  mapConfig: {
    mode: BRMapMode;
    pool: string[];
    fixedMap: string | null;
  };
  scoring: {
    placements: number[];
    killPoints: number;
    killCap: number | null;
  };
  tiebreaker: BRTiebreaker;
  format: BRStageFormat;
  advancement: {
    mode: string;
    count: number | null;
  };
  lobbyFormation: string;
  leaderboardScope: string;
  playersPerLobby: number;
}

function mapAdvancementMode(mode: string): BRAdvancementMode {
  switch (mode) {
    case 'top_n_per_lobby':
      return 'top_n_per_lobby';
    case 'top_n_overall':
      return 'top_n_overall';
    case 'threshold':
      return 'threshold';
    case 'none':
      return 'none';
    default:
      return 'top_n_per_group';
  }
}

export function mapApiConfigToResolvedStageBRConfig(
  api: ResolvedBrStageConfigApi,
): ResolvedStageBRConfig {
  const advancement: BRAdvancementConfig = {
    mode: mapAdvancementMode(api.advancement.mode),
  };
  const count = api.advancement.count;
  if (count != null && count > 0) {
    switch (advancement.mode) {
      case 'top_n_per_lobby':
        advancement.perLobby = count;
        break;
      case 'top_n_overall':
        advancement.overall = count;
        break;
      case 'threshold':
        advancement.threshold = count;
        break;
      default:
        advancement.perGroup = count;
    }
  }

  const scoring: BRScoringPreset = {
    name: 'Resolved',
    placements: api.scoring.placements,
    killPoints: api.scoring.killPoints,
    killCap: api.scoring.killCap,
  };

  const mapConfig: BRMapConfig = {
    mode: api.mapConfig.mode,
    pool: api.mapConfig.pool ?? [],
    fixedMap: api.mapConfig.fixedMap,
  };

  return {
    scoringPreset: scoring,
    killCap: api.scoring.killCap,
    tiebreaker: api.tiebreaker,
    gameCount: api.gamesPerLobby,
    gamesPerLobby: api.gamesPerLobby,
    lobbySize: api.playersPerLobby,
    format: api.format,
    leaderboardScope: mapLeaderboardScope(api.leaderboardScope),
    lobbyFormation: null,
    advancement,
    map: mapConfig,
  };
}

function mapLeaderboardScope(scope: string): BRLeaderboardScope {
  switch (scope) {
    case 'PerSeedGroup':
      return 'per_seed_group';
    case 'PerLobby':
      return 'per_lobby';
    default:
      return 'stage_global';
  }
}

type FallbackStageLike = {
  capacity?: number | null;
  advancement_count?: number | null;
  config?: unknown;
};

interface UseBRStageConfigOptions {
  tournamentSettings?: Record<string, unknown> | null;
  stage?: FallbackStageLike | null;
  gameName?: string | null;
  catalogBrConfig?: unknown;
}

export function useBRStageConfig(
  stageId: string | null | undefined,
  options?: UseBRStageConfigOptions,
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['br-stage-config', stageId],
    queryFn: () =>
      apiClient.get<ResolvedBrStageConfigApi>(`/api/stages/${stageId}/br/config`),
    enabled: !!stageId,
    staleTime: 60_000,
  });

  const fallbackConfig =
    options?.stage != null && options.gameName
      ? resolveStageBRConfig({
          gameName: options.gameName,
          settings: options.tournamentSettings ?? null,
          stage: options.stage,
          catalogBrConfig: options.catalogBrConfig as import('@/types/battleRoyale').BRConfig | null,
        })
      : null;

  const resolved = data ? mapApiConfigToResolvedStageBRConfig(data) : fallbackConfig;

  return {
    config: resolved,
    apiConfig: data ?? null,
    isLoading,
    error,
    refetch,
    isFromApi: !!data,
  };
}

export function resolveMapFromConfig(
  mapConfig: BRMapConfig | undefined,
  roundNumber: number,
  explicitMap?: string | null,
): string | null {
  if (!mapConfig || mapConfig.mode === 'none') return null;
  if (explicitMap?.trim()) return explicitMap.trim();
  if (mapConfig.mode === 'fixed_stage') return mapConfig.fixedMap;
  if (mapConfig.mode === 'rotation' && mapConfig.pool.length > 0) {
    return mapConfig.pool[(roundNumber - 1) % mapConfig.pool.length] ?? null;
  }
  return null;
}