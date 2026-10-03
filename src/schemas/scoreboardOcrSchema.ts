import { z } from 'zod';

const field = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ value: value.nullable().optional().transform((v) => v ?? null), confidence: z.number().min(0).max(1) });

const statField = field(z.number()).optional();
const statFields = z.object({
  acs: statField,
  kills: statField,
  deaths: statField,
  assists: statField,
  econ: statField,
  firstBloods: statField,
  plants: statField,
  defuses: statField,
  hsPct: statField,
  adr: statField,
});

export const scoreboardOcrResultSchema = z.object({
  game: z.literal('valorant'),
  parserVersion: z.string(),
  engineVersion: z.string(),
  outcome: field(z.enum(['victory', 'defeat', 'draw'])),
  allyScore: field(z.number().int()),
  enemyScore: field(z.number().int()),
  map: field(z.object({ name: z.string(), uuid: z.string().nullish(), mapUrl: z.string().nullish() })),
  allyTeam: field(z.enum(['team1', 'team2'])),
  columns: z.array(z.string()),
  players: z
    .array(
      z.object({
        side: z.enum(['ally', 'enemy']).nullable(),
        sideConfidence: z.number(),
        name: field(z.string()),
        rosterMatch: z
          .object({ userId: z.string(), team: z.enum(['team1', 'team2']), matchedName: z.string(), score: z.number() })
          .nullish(),
        agent: field(z.object({ uuid: z.string(), name: z.string(), role: z.string().nullish() })),
        stats: statFields,
      }),
    )
    .max(12),
  warnings: z.array(z.object({ code: z.string(), message: z.string(), playerIndex: z.number().nullish() })),
});

export const scoreboardOcrParseSchema = z.object({
  parseId: z.string().uuid(),
  screenshotUrl: z.string().url(),
  mapId: z.string().uuid().nullable(),
  team1Id: z.string().uuid(),
  team2Id: z.string().uuid(),
  result: scoreboardOcrResultSchema,
});

const stat = z.number().int().min(0).max(9999).nullable();

/** What the captain may submit after review. Hard rules only; soft checks are warnings in the UI. */
export const ocrReviewSchema = z
  .object({
    team1Score: z.number({ invalid_type_error: 'Enter both round scores.' }).int().min(0).max(99),
    team2Score: z.number({ invalid_type_error: 'Enter both round scores.' }).int().min(0).max(99),
    players: z
      .array(
        z.object({
          team: z.enum(['team1', 'team2'], { invalid_type_error: 'Pick a team for every player.' }),
          name: z.string().trim().min(1, 'Every player needs a name.').max(40),
          stats: z.object({
            acs: stat.optional(),
            kills: stat.optional(),
            deaths: stat.optional(),
            assists: stat.optional(),
            firstBloods: stat.optional(),
          }).passthrough(),
        }),
      )
      .length(10, 'A Valorant scoreboard has 10 players.'),
  })
  .refine((v) => v.team1Score !== v.team2Score, { message: 'A finished match cannot be a draw.', path: ['team1Score'] })
  .refine((v) => v.players.filter((p) => p.team === 'team1').length === 5, {
    message: 'Each team needs exactly 5 players.',
    path: ['players'],
  });

export type OcrReviewInput = z.input<typeof ocrReviewSchema>;

/** Client-side checks before upload; the server re-validates type, signature and size. */
export const SCREENSHOT_MAX_BYTES = 10 * 1024 * 1024;
export const SCREENSHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export function validateScreenshotFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!SCREENSHOT_TYPES.includes(file.type as (typeof SCREENSHOT_TYPES)[number]) || !['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    return 'Upload a PNG, JPG or WebP screenshot.';
  }
  if (file.size > SCREENSHOT_MAX_BYTES) return 'Screenshot must be 10 MB or smaller.';
  if (file.size === 0) return 'This file is empty.';
  return null;
}
