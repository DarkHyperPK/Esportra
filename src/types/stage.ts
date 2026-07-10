/**
 * Canonical stage types - THE single source of truth for stage configuration.
 *
 * All other stage type definitions should be deprecated in favor of these.
 * Use StageRow for data coming from the API (snake_case).
 * Use StageDto for data going to the API (camelCase).
 */

export type StageFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'swiss'
  | 'battle_royale';

export type BoMode = 'per_stage' | 'per_round';

export type StageStatus = 'draft' | 'ready' | 'active' | 'completed' | 'archived';

/**
 * Database row format (snake_case, as returned by API).
 * This is what you receive from GET endpoints.
 */
export interface StageRow {
  id: string;
  tournament_id: string;
  name: string;
  format: StageFormat;
  stage_order: number;
  capacity: number | null;
  advancement_count: number | null;
  best_of: number;
  bo_mode: BoMode;
  round_bo_overrides: Record<string, number> | null;
  config: Record<string, unknown> | null;
  status: StageStatus | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined fields (optional, from some queries)
  tournament_name?: string;
  tournament_slug?: string;
}

/**
 * API DTO for create/update operations (camelCase).
 * This is what you send to PUT/POST endpoints.
 */
export interface StageDto {
  id: string | null;
  name: string;
  format: StageFormat;
  stageOrder: number;
  capacity: number | null;
  advancementCount: number | null;
  bestOf: number;
  boMode: BoMode;
  roundBoOverrides?: Record<string, number>;
  config?: Record<string, unknown>;
  startsAt?: string;
  endsAt?: string;
}

/**
 * Round info for per-round BO configuration UI.
 * Returned by GET /api/stages/round-structure endpoint.
 */
export interface RoundInfo {
  key: string;
  label: string;
  order: number;
  bracketType: 'winners' | 'losers' | 'final';
}

/**
 * Stage settings that go into the config JSONB field.
 * Format-specific settings like Swiss rounds, group counts, etc.
 */
export interface StageSettings {
  swiss_groups?: number;
  swiss_rounds?: number;
  group_count?: number;
  points_per_win?: number;
  points_per_draw?: number;
  points_per_loss?: number;
  use_check_in_only?: boolean;
}

/**
 * Valid best-of values for tournament matches.
 */
export const VALID_BEST_OF = [1, 3, 5] as const;
export type ValidBestOf = (typeof VALID_BEST_OF)[number];
