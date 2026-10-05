import { z } from 'zod';
import type { VerificationFlag } from '@/types/scoreboardOcr';
import { isRiotCandidate } from '@/services/riotReport/riotReport';
import type { RiotMatchCandidate } from '@/types/riotMatchCandidate';

const VERIFICATION_FLAGS = ['screenshot_reused', 'date_mismatch', 'stats_mismatch', 'score_mismatch'] as const satisfies readonly VerificationFlag[];

const field = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ value: value.nullable().optional().transform((v) => v ?? null), confidence: z.number().min(0).max(1) });

const statField = field(z.number()).optional();
const statFields = z.object({
  acs: statField,
  kills: statField,
  deaths: statField,
  assists: statField,
  econ: statField,
  trades: statField,
  firstBloods: statField,
  plants: statField,
  defuses: statField,
  hsPct: statField,
  adr: statField,
});

const nameSource = z.enum(['riot_verified', 'riot_previous', 'riot_claimed', 'username']);

export const ocrVerificationSchema = z.object({
  players: z.array(
    z.object({
      index: z.number().int(),
      name: z.string(),
      team: z.enum(['team1', 'team2']).nullable(),
      userId: z.string().nullable(),
      status: z.enum(['verified', 'claimed', 'username_only', 'unconfirmed', 'edited', 'other_team', 'duplicate', 'unknown']),
      source: nameSource.nullable(),
      readName: z.string().nullable(),
      riotStatus: z.enum(['confirmed', 'other_account', 'not_in_match', 'unregistered']).nullish().catch(null),
      riotId: z.string().nullish(),
      riotKda: z.string().nullish(),
    }),
  ),
  // Unknown flags from a newer API are dropped instead of failing the whole check.
  flags: z
    .array(z.string())
    .catch([])
    .transform((flags) => flags.filter((f): f is VerificationFlag => (VERIFICATION_FLAGS as readonly string[]).includes(f))),
  riot: z
    .object({
      status: z.enum(['pending', 'confirmed', 'not_found', 'unavailable']),
      matchId: z.string().nullish(),
      checkedAt: z.string().nullish(),
      autoAccepted: z.boolean().optional(),
    })
    .nullish()
    .catch(null),
});

export const scoreboardOcrResultSchema = z.object({
  game: z.literal('valorant'),
  parserVersion: z.string(),
  engineVersion: z.string(),
  outcome: field(z.enum(['victory', 'defeat', 'draw'])),
  allyScore: field(z.number().int()),
  enemyScore: field(z.number().int()),
  map: field(z.object({ name: z.string(), uuid: z.string().nullish(), mapUrl: z.string().nullish() })),
  playedOn: field(z.string()).optional(),
  captureStretch: z.number().optional(),
  allyTeam: field(z.enum(['team1', 'team2'])),
  columns: z.array(z.string()),
  players: z
    .array(
      z.object({
        side: z.enum(['ally', 'enemy']).nullable(),
        sideConfidence: z.number(),
        name: field(z.string()),
        nameRead: z.string().nullish(),
        rosterMatch: z
          .object({
            userId: z.string(),
            team: z.enum(['team1', 'team2']),
            matchedName: z.string(),
            score: z.number(),
            source: nameSource.nullish(),
            method: z.enum(['read', 'elimination']).optional(),
          })
          .nullish(),
        agent: field(z.object({ uuid: z.string().nullable().optional().transform((v) => v ?? null), name: z.string(), role: z.string().nullish() })),
        stats: statFields,
      }),
    )
    .max(12),
  warnings: z.array(z.object({ code: z.string(), message: z.string(), playerIndex: z.number().nullish() })),
});

const riotPlayerSchema = z.object({
  puuid: z.string(),
  gameName: z.string(),
  tagLine: z.string(),
  teamId: z.string(),
  characterId: z.string(),
  kills: z.number().int(),
  deaths: z.number().int(),
  assists: z.number().int(),
  acs: z.number().nullish().transform((v) => v ?? null),
  firstBloods: z.number().nullish().transform((v) => v ?? null),
  isTeam1: z.boolean(),
  isTeam2: z.boolean(),
});

/** The screenshot's game in Riot's match history. A malformed block is dropped, never fatal. */
export const riotLookupSchema = z
  .object({
    status: z.enum(['found', 'not_found', 'unavailable', 'skipped']),
    /** The screenshot is provably this Riot game: it is reported from Riot right away. */
    confident: z.boolean().optional(),
    candidate: z.custom<RiotMatchCandidate>(isRiotCandidate).nullish().catch(null),
    match: z
      .object({
        matchId: z.string(),
        map: z.string(),
        startedAt: z.string(),
        team1Rounds: z.number().int().nullable(),
        team2Rounds: z.number().int().nullable(),
        players: z.array(riotPlayerSchema),
      })
      .nullable(),
  })
  .nullish()
  .catch(null);

export const scoreboardOcrParseSchema = z.object({
  parseId: z.string().uuid(),
  screenshotUrl: z.string().url(),
  mapId: z.string().uuid().nullable(),
  team1Id: z.string().uuid(),
  team2Id: z.string().uuid(),
  result: scoreboardOcrResultSchema,
  verification: ocrVerificationSchema.nullish(),
  riot: riotLookupSchema,
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
      .min(2, 'Add the players from the scoreboard.')
      .max(10, 'A Valorant scoreboard has at most 10 players.'),
  })
  .refine((v) => v.team1Score !== v.team2Score, { message: 'A finished match cannot be a draw.', path: ['team1Score'] })
  .refine(
    // 4v5 happens (a player who never connected); more than 5 on a side never does.
    (v) => (['team1', 'team2'] as const).every((team) => {
      const count = v.players.filter((p) => p.team === team).length;
      return count >= 1 && count <= 5;
    }),
    { message: 'Each team needs between 1 and 5 players.', path: ['players'] },
  );

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
