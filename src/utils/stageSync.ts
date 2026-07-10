/**
 * Stage synchronization utilities.
 *
 * NOTE: This file is being deprecated in favor of:
 * - Types: @/types/stage.ts
 * - Mappers: @/utils/stageMapper.ts
 * - Validation: @/schemas/stageSchema.ts
 *
 * This file re-exports from the new canonical locations for backward compatibility.
 * New code should import directly from the canonical locations.
 */

// Re-export canonical types
export type {
  StageRow,
  StageDto,
  StageFormat,
  BoMode,
  StageSettings,
  RoundInfo,
} from '@/types/stage';

// Re-export canonical functions
export {
  normalizeBestOf,
  normalizeStage,
  normalizeStages,
  rowToDto,
  dtoToPayload,
  buildStageConfigPayload,
  parseStageConfig,
  createDefaultStageDto,
} from '@/utils/stageMapper';

// ============================================================================
// DEPRECATED TYPES - Use canonical types from @/types/stage.ts instead
// ============================================================================

/**
 * @deprecated Use StageRow from @/types/stage.ts instead
 */
export type TournamentStageRow = {
  id: string;
  name: string;
  format: string;
  stage_order: number;
  capacity?: number | null;
  advancement_count?: number | null;
  best_of?: number | null;
  bo_mode?: 'per_stage' | 'per_round' | null;
  round_bo_overrides?: Record<string, number> | null;
  config?: unknown;
};

/**
 * @deprecated Use StageDto from @/types/stage.ts instead
 */
export type StageSyncDto = {
  id: string | null;
  name: string;
  format: string;
  stageOrder: number;
  capacity: number | null;
  advancementCount: number | null;
  bestOf: number;
  boMode?: 'per_stage' | 'per_round';
  roundBoOverrides?: Record<string, number>;
  config?: Record<string, unknown>;
};

/**
 * @deprecated Use Record<string, number> directly
 */
export type RoundBoOverrides = Record<string, number>;

/**
 * @deprecated Use StageDto from @/types/stage.ts instead
 */
export type NewStageInput = {
  name: string;
  format: string;
  capacity?: number | null;
  advancementCount?: number | null;
  bestOf?: number;
  boMode?: 'per_stage' | 'per_round';
  roundBoOverrides?: Record<string, number>;
  config?: Record<string, unknown>;
};

// ============================================================================
// DEPRECATED FUNCTIONS - Use functions from @/utils/stageMapper.ts instead
// ============================================================================

const VALID_BEST_OF = [1, 2, 3, 5, 7, 9] as const;

/**
 * @deprecated Use normalizeBestOf from @/utils/stageMapper.ts instead
 */
export function normalizeStageBestOf(value?: number | null): number {
  if (value != null && VALID_BEST_OF.includes(value as (typeof VALID_BEST_OF)[number])) {
    return value;
  }
  return 1;
}

/**
 * @deprecated Use rowToDto from @/utils/stageMapper.ts instead
 */
export function mapTournamentStageToSyncDto(
  stage: TournamentStageRow,
  stageOrder?: number
): StageSyncDto {
  const config = parseStageConfigLegacy(stage.config);
  const hasConfig = Object.keys(config).length > 0;

  return {
    id: stage.id,
    name: stage.name,
    format: stage.format,
    stageOrder: stageOrder ?? stage.stage_order,
    capacity: stage.capacity ?? null,
    advancementCount: stage.advancement_count ?? null,
    bestOf: normalizeStageBestOf(stage.best_of),
    boMode: stage.bo_mode ?? 'per_stage',
    ...(stage.round_bo_overrides && { roundBoOverrides: stage.round_bo_overrides }),
    ...(hasConfig && { config }),
  };
}

/**
 * @deprecated Use buildStageSyncPayload pattern with dtoToPayload from @/utils/stageMapper.ts
 */
export function buildStageSyncPayload(
  existingStages: TournamentStageRow[],
  newStage?: NewStageInput
): StageSyncDto[] {
  const ordered = [...existingStages].sort((a, b) => a.stage_order - b.stage_order);
  const dtos = ordered.map((stage, index) => mapTournamentStageToSyncDto(stage, index + 1));

  if (newStage) {
    const config = newStage.config;
    const hasConfig = config && Object.keys(config).length > 0;
    const hasOverrides =
      newStage.roundBoOverrides && Object.keys(newStage.roundBoOverrides).length > 0;
    dtos.push({
      id: null,
      name: newStage.name,
      format: newStage.format,
      stageOrder: dtos.length + 1,
      capacity: newStage.capacity ?? null,
      advancementCount: newStage.advancementCount ?? null,
      bestOf: normalizeStageBestOf(newStage.bestOf),
      boMode: newStage.boMode ?? 'per_stage',
      ...(hasOverrides && { roundBoOverrides: newStage.roundBoOverrides }),
      ...(hasConfig && { config }),
    });
  }

  return dtos;
}

// Internal legacy helper (kept for backward compat)
function parseStageConfigLegacy(config: unknown): Record<string, unknown> {
  if (!config) return {};
  if (typeof config === 'string') {
    try {
      const parsed = JSON.parse(config) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (typeof config === 'object') {
    return { ...(config as Record<string, unknown>) };
  }
  return {};
}
