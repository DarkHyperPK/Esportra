const VALID_BEST_OF = [1, 2, 3, 5, 7, 9] as const;

export type TournamentStageRow = {
  id: string;
  name: string;
  format: string;
  stage_order: number;
  capacity?: number | null;
  advancement_count?: number | null;
  best_of?: number | null;
  config?: unknown;
};

export type StageSettings = {
  swiss_groups?: number;
  swiss_rounds?: number;
  group_count?: number;
  points_per_win?: number;
  points_per_draw?: number;
  points_per_loss?: number;
  use_check_in_only?: boolean;
};

export type StageSyncDto = {
  id: string | null;
  name: string;
  format: string;
  stageOrder: number;
  capacity: number | null;
  advancementCount: number | null;
  bestOf: number;
  config?: Record<string, unknown>;
};

export function parseStageConfig(config: unknown): Record<string, unknown> {
  if (!config) return {};
  if (typeof config === 'string') {
    try {
      const parsed = JSON.parse(config) as unknown;
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  if (typeof config === 'object') {
    return { ...(config as Record<string, unknown>) };
  }
  return {};
}

export function normalizeStageBestOf(value?: number | null): number {
  if (value != null && VALID_BEST_OF.includes(value as (typeof VALID_BEST_OF)[number])) {
    return value;
  }
  return 1;
}

export function buildStageConfigPayload(settings?: StageSettings): Record<string, unknown> | undefined {
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

export function mapTournamentStageToSyncDto(
  stage: TournamentStageRow,
  stageOrder?: number,
): StageSyncDto {
  const config = parseStageConfig(stage.config);
  const hasConfig = Object.keys(config).length > 0;

  return {
    id: stage.id,
    name: stage.name,
    format: stage.format,
    stageOrder: stageOrder ?? stage.stage_order,
    capacity: stage.capacity ?? null,
    advancementCount: stage.advancement_count ?? null,
    bestOf: normalizeStageBestOf(stage.best_of),
    ...(hasConfig && { config }),
  };
}

export type NewStageInput = {
  name: string;
  format: string;
  capacity?: number | null;
  advancementCount?: number | null;
  bestOf?: number;
  config?: Record<string, unknown>;
};

export function buildStageSyncPayload(
  existingStages: TournamentStageRow[],
  newStage?: NewStageInput,
): StageSyncDto[] {
  const ordered = [...existingStages].sort((a, b) => a.stage_order - b.stage_order);
  const dtos = ordered.map((stage, index) => mapTournamentStageToSyncDto(stage, index + 1));

  if (newStage) {
    const config = newStage.config;
    const hasConfig = config && Object.keys(config).length > 0;
    dtos.push({
      id: null,
      name: newStage.name,
      format: newStage.format,
      stageOrder: dtos.length + 1,
      capacity: newStage.capacity ?? null,
      advancementCount: newStage.advancementCount ?? null,
      bestOf: normalizeStageBestOf(newStage.bestOf),
      ...(hasConfig && { config }),
    });
  }

  return dtos;
}
