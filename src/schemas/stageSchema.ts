/**
 * Zod validation schemas for stage configuration.
 *
 * Use these schemas to validate stage data at boundaries:
 * - API request payloads before sending
 * - Form submissions
 * - Imported/pasted data
 */

import { z } from 'zod';

/**
 * Valid stage formats
 */
export const stageFormatSchema = z.enum([
  'single_elimination',
  'double_elimination',
  'round_robin',
  'swiss',
  'battle_royale',
]);

/**
 * BO mode - per-stage (uniform) or per-round (configurable)
 */
export const boModeSchema = z.enum(['per_stage', 'per_round']);

/**
 * Valid best-of values (must be odd for winner determination, except special cases)
 */
export const bestOfSchema = z
  .number()
  .int()
  .refine((v) => [1, 3, 5].includes(v), {
    message: 'Best-of must be 1, 3, or 5',
  });

/**
 * Round BO overrides - maps round keys to BO values
 * Keys like "final", "semifinals", "winners_round_1", "losers_round_2", etc.
 */
export const roundBoOverridesSchema = z.record(
  z.string(),
  z.number().int().refine((v) => [1, 3, 5].includes(v), {
    message: 'Round BO must be 1, 3, or 5',
  })
);

/**
 * Stage settings (format-specific config)
 */
export const stageSettingsSchema = z.object({
  swiss_groups: z.number().int().positive().optional(),
  swiss_rounds: z.number().int().positive().optional(),
  group_count: z.number().int().positive().optional(),
  points_per_win: z.number().int().nonnegative().optional(),
  points_per_draw: z.number().int().nonnegative().optional(),
  points_per_loss: z.number().int().nonnegative().optional(),
  use_check_in_only: z.boolean().optional(),
});

/**
 * Stage DTO schema for API payloads (camelCase)
 */
export const stageDtoSchema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().min(1, 'Stage name is required').max(100, 'Stage name too long'),
  format: stageFormatSchema,
  stageOrder: z.number().int().positive(),
  capacity: z.number().int().positive().nullable(),
  advancementCount: z.number().int().positive().nullable(),
  bestOf: bestOfSchema,
  boMode: boModeSchema,
  roundBoOverrides: roundBoOverridesSchema.optional(),
  config: z.record(z.unknown()).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

/**
 * Stage row schema for API responses (snake_case)
 */
export const stageRowSchema = z.object({
  id: z.string().uuid(),
  tournament_id: z.string().uuid(),
  name: z.string(),
  format: stageFormatSchema,
  stage_order: z.number().int(),
  capacity: z.number().int().nullable(),
  advancement_count: z.number().int().nullable(),
  best_of: z.number().int(),
  bo_mode: boModeSchema,
  round_bo_overrides: roundBoOverridesSchema.nullable(),
  config: z.record(z.unknown()).nullable(),
  status: z.enum(['draft', 'ready', 'active', 'completed', 'archived']).nullable(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Round info schema (from round-structure endpoint)
 */
export const roundInfoSchema = z.object({
  key: z.string(),
  label: z.string(),
  order: z.number().int(),
  bracketType: z.enum(['winners', 'losers', 'final']),
});

/**
 * Inferred types from schemas
 */
export type ValidatedStageDto = z.infer<typeof stageDtoSchema>;
export type ValidatedStageRow = z.infer<typeof stageRowSchema>;
export type ValidatedRoundInfo = z.infer<typeof roundInfoSchema>;
export type ValidatedStageSettings = z.infer<typeof stageSettingsSchema>;

/**
 * Validate a stage DTO and return typed result or errors.
 */
export function validateStageDto(data: unknown): {
  success: boolean;
  data?: ValidatedStageDto;
  errors?: z.ZodError;
} {
  const result = stageDtoSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate capacity and advancement count relationship.
 * Advancement count must be less than capacity.
 */
export function validateStageCapacityRules(
  capacity: number | null,
  advancementCount: number | null,
  isLastStage: boolean
): { valid: boolean; error?: string } {
  if (isLastStage && advancementCount != null && advancementCount > 0) {
    return { valid: false, error: 'Last stage cannot have advancement count' };
  }

  if (capacity != null && advancementCount != null && advancementCount >= capacity) {
    return { valid: false, error: 'Advancement count must be less than capacity' };
  }

  return { valid: true };
}

/**
 * Validate that per-round BO overrides are complete for elimination formats.
 */
export function validateRoundBoOverrides(
  format: string,
  boMode: string,
  overrides: Record<string, number> | null | undefined,
  expectedRoundKeys: string[]
): { valid: boolean; missingRounds?: string[] } {
  if (boMode !== 'per_round') {
    return { valid: true };
  }

  if (!overrides || Object.keys(overrides).length === 0) {
    return { valid: false, missingRounds: expectedRoundKeys };
  }

  const missing = expectedRoundKeys.filter((key) => !(key in overrides));
  if (missing.length > 0) {
    return { valid: false, missingRounds: missing };
  }

  return { valid: true };
}
