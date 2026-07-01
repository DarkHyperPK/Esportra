/**
 * Stage transformation utilities - THE single place for all stage data transformations.
 *
 * Use these functions at API boundaries to normalize data:
 * - normalizeStage(): when receiving data from API (handles mixed casing)
 * - rowToDto(): convert normalized row to DTO for component state
 * - dtoToPayload(): prepare DTO for sending to API
 */

import type {
  StageRow,
  StageDto,
  StageFormat,
  BoMode,
  StageSettings,
} from '@/types/stage';

const VALID_BEST_OF_VALUES: readonly number[] = [1, 3, 5];

const VALID_FORMATS: StageFormat[] = [
  'single_elimination',
  'double_elimination',
  'round_robin',
  'swiss',
  'battle_royale',
];

/**
 * Normalize best-of value to a valid option (1, 3, or 5).
 */
export function normalizeBestOf(value: unknown): number {
  const num = typeof value === 'number' ? value : 1;
  return VALID_BEST_OF_VALUES.includes(num) ? num : 1;
}

/**
 * Normalize format string to valid StageFormat.
 */
export function normalizeFormat(value: unknown): StageFormat {
  const str = typeof value === 'string' ? value.toLowerCase() : 'single_elimination';
  return VALID_FORMATS.includes(str as StageFormat)
    ? (str as StageFormat)
    : 'single_elimination';
}

/**
 * Normalize BO mode to valid option.
 */
export function normalizeBoMode(value: unknown): BoMode {
  return value === 'per_round' ? 'per_round' : 'per_stage';
}

/**
 * Convert API row (snake_case) to DTO (camelCase).
 * Use this when you have a properly typed StageRow and need a StageDto.
 */
export function rowToDto(row: StageRow): StageDto {
  return {
    id: row.id,
    name: row.name,
    format: row.format,
    stageOrder: row.stage_order,
    capacity: row.capacity,
    advancementCount: row.advancement_count,
    bestOf: normalizeBestOf(row.best_of),
    boMode: row.bo_mode ?? 'per_stage',
    ...(row.round_bo_overrides && { roundBoOverrides: row.round_bo_overrides }),
    ...(row.config && { config: row.config }),
    ...(row.starts_at && { startsAt: row.starts_at }),
    ...(row.ends_at && { endsAt: row.ends_at }),
  };
}

/**
 * Convert DTO (camelCase) to API payload.
 * Ensures all values are normalized before sending to API.
 */
export function dtoToPayload(dto: StageDto): StageDto {
  const hasOverrides =
    dto.boMode === 'per_round' &&
    dto.roundBoOverrides &&
    Object.keys(dto.roundBoOverrides).length > 0;

  return {
    id: dto.id,
    name: dto.name,
    format: dto.format,
    stageOrder: dto.stageOrder,
    capacity: dto.capacity,
    advancementCount: dto.advancementCount,
    bestOf: normalizeBestOf(dto.bestOf),
    boMode: dto.boMode ?? 'per_stage',
    ...(hasOverrides && { roundBoOverrides: dto.roundBoOverrides }),
    ...(dto.config && Object.keys(dto.config).length > 0 && { config: dto.config }),
    ...(dto.startsAt && { startsAt: dto.startsAt }),
    ...(dto.endsAt && { endsAt: dto.endsAt }),
  };
}

/**
 * Normalize mixed-case API response to StageRow.
 * This is the KEY function - use it at API fetch boundaries to handle
 * inconsistent casing from different endpoints.
 */
export function normalizeStage(data: Record<string, unknown>): StageRow {
  // Helper to get value from either casing
  const get = <T>(snake: string, camel: string, fallback: T): T => {
    const val = data[snake] ?? data[camel];
    return val !== undefined ? (val as T) : fallback;
  };

  return {
    id: get<string>('id', 'Id', ''),
    tournament_id: get<string>('tournament_id', 'tournamentId', ''),
    name: get<string>('name', 'Name', ''),
    format: normalizeFormat(get<string>('format', 'Format', 'single_elimination')),
    stage_order: get<number>('stage_order', 'stageOrder', 0),
    capacity: get<number | null>('capacity', 'Capacity', null),
    advancement_count: get<number | null>('advancement_count', 'advancementCount', null),
    best_of: normalizeBestOf(get<number>('best_of', 'bestOf', 1)),
    bo_mode: normalizeBoMode(get<string>('bo_mode', 'boMode', 'per_stage')),
    round_bo_overrides: get<Record<string, number> | null>(
      'round_bo_overrides',
      'roundBoOverrides',
      null
    ),
    config: get<Record<string, unknown> | null>('config', 'Config', null),
    status: get<StageRow['status']>('status', 'Status', null),
    starts_at: get<string | null>('starts_at', 'startsAt', null),
    ends_at: get<string | null>('ends_at', 'endsAt', null),
    created_at: get<string | undefined>('created_at', 'createdAt', undefined),
    updated_at: get<string | undefined>('updated_at', 'updatedAt', undefined),
    // Joined fields
    tournament_name: get<string | undefined>('tournament_name', 'tournamentName', undefined),
    tournament_slug: get<string | undefined>('tournament_slug', 'tournamentSlug', undefined),
  };
}

/**
 * Normalize an array of stages from API response.
 */
export function normalizeStages(data: unknown[]): StageRow[] {
  return data.map((item) => normalizeStage(item as Record<string, unknown>));
}

/**
 * Build stage config payload from settings object.
 * Used for format-specific settings like swiss_groups, etc.
 */
export function buildStageConfigPayload(
  settings?: StageSettings
): Record<string, unknown> | undefined {
  if (!settings) return undefined;

  const config: Record<string, unknown> = {};
  if (settings.swiss_groups != null) config.swiss_groups = settings.swiss_groups;
  if (settings.swiss_rounds != null) config.swiss_rounds = settings.swiss_rounds;
  if (settings.group_count != null) config.group_count = settings.group_count;
  if (settings.points_per_win != null) config.points_per_win = settings.points_per_win;
  if (settings.points_per_draw != null) config.points_per_draw = settings.points_per_draw;
  if (settings.points_per_loss != null) config.points_per_loss = settings.points_per_loss;
  if (settings.use_check_in_only != null) config.use_check_in_only = settings.use_check_in_only;

  return Object.keys(config).length > 0 ? config : undefined;
}

/**
 * Parse stage config from various formats (string JSON or object).
 */
export function parseStageConfig(config: unknown): Record<string, unknown> {
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

/**
 * Create a default stage DTO for new stage creation.
 */
export function createDefaultStageDto(stageOrder: number = 1): StageDto {
  return {
    id: null,
    name: '',
    format: 'single_elimination',
    stageOrder,
    capacity: null,
    advancementCount: null,
    bestOf: 1,
    boMode: 'per_stage',
  };
}
