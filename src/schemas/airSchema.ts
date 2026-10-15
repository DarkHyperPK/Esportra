import { z } from "zod";

export const airText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (value) =>
        ![...value].some(
          (character) =>
            character.charCodeAt(0) < 32 ||
            character.charCodeAt(0) === 127 ||
            character === "<" ||
            character === ">",
        ),
      "Use plain text",
    );
export const airPlayerSchema = z.object({
  id: z.string().uuid(),
  originalName: airText(80),
  inGameName: airText(100),
  gameId: z.string().uuid().nullish(),
  hudNickname: z.string().max(80).nullish(),
  role: z.enum(["starter", "substitute"]),
});
export const airTeamSchema = z.object({
  id: z.string().uuid(),
  name: airText(80),
  tag: airText(12),
  logoAssetId: z.string().uuid().nullish(),
  players: z.array(airPlayerSchema).max(15),
});
export const airMatchSchema = z.object({
  id: z.string().uuid(),
  title: airText(120),
  teamIds: z
    .array(z.string().uuid())
    .length(2)
    .refine((ids) => ids[0] !== ids[1], "Choose different teams"),
  bestOf: z.union([
    z.literal(1),
    z.literal(3),
    z.literal(5),
    z.literal(7),
    z.literal(9),
  ]),
  mapPool: z.array(airText(80)).max(15),
  scheduledAt: z.string().datetime().nullish(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  scores: z.array(z.number().int().min(0).max(5)).length(2).nullish(),
});
export const airDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  teams: z.array(airTeamSchema).max(128),
  matches: z.array(airMatchSchema).max(512),
  screens: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: airText(80),
        type: z.enum([
          "pre_show",
          "match",
          "break",
          "post_show",
          "sponsor_slot",
          "custom",
        ]),
        overlay: z.string().regex(/^[a-z0-9-]{1,64}$/),
        matchId: z.string().uuid().nullish(),
      }),
    )
    .max(200),
  bracket: z.object({
    format: z.string(),
    stages: z.array(
      z.object({
        id: z.string().uuid(),
        label: airText(100),
        format: z.string(),
        matches: z.array(
          z.object({
            id: z.string().uuid(),
            matchId: z.string().uuid(),
            round: z.number().int().min(0).max(32),
            side: z.enum(["upper", "lower", "final", "group"]),
            nextMatchId: z.string().uuid().nullish(),
          }),
        ),
      }),
    ),
  }),
  sponsors: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: airText(100),
        logoAssetId: z.string().uuid().nullish(),
      }),
    )
    .nullish(),
  talent: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: airText(100),
        role: airText(80),
      }),
    )
    .nullish(),
  crew: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: airText(100),
        role: airText(80),
      }),
    )
    .nullish(),
});
export const airProjectInputSchema = z.object({
  title: airText(120),
  document: airDocumentSchema,
  revision: z.number().int().nonnegative().optional(),
});
export const airPlanSchema = z.object({
  name: airText(80),
  productionLimit: z.number().int().min(0).max(1000).nullable(),
  captureLimit: z.number().int().min(0).max(1000).nullable(),
  enabled: z.boolean(),
});
export const airGrantSchema = z.object({
  planId: z.string().uuid(),
  validUntil: z.string().datetime().nullable(),
  status: z.enum(["active", "suspended", "revoked"]),
  reason: airText(500),
  overrideDeviceLimits: z.boolean().optional(),
  productionLimit: z.number().int().min(0).max(1000).nullable().optional(),
  captureLimit: z.number().int().min(0).max(1000).nullable().optional(),
});
export const airReleaseSchema = z.object({
  version: z
    .string()
    .regex(/^\d{1,4}\.\d{1,4}\.\d{1,4}(-[a-zA-Z0-9.-]{1,20})?$/),
  channel: z.enum(["stable", "preview"]),
  downloadUrl: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        ["esportra.gg", "staging.esportra.gg"].includes(url.hostname) &&
        !url.username &&
        !url.password
      );
    }, "Use an official Esportra HTTPS download URL"),
  notes: z.string().max(10000),
  published: z.boolean(),
});
