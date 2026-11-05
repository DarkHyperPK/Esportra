import { z } from 'zod';
import { squadUpModeSchema } from './squadUp';

const optionalString = z.string().nullable().optional();

export const lobbyMemberSchema = z.object({
  userId: z.string(), username: optionalString, avatarUrl: optionalString, avatarSeed: optionalString, avatarStyle: optionalString,
  roleKey: optionalString, status: z.enum(['requested', 'accepted']), createdAt: z.string(),
  competitiveTier: z.number().nullable().optional(), competitiveTierName: optionalString,
  riotGameName: optionalString, riotTagLine: optionalString,
});
export type LobbyMember = z.infer<typeof lobbyMemberSchema>;

const acceptedMember = z.object({
  user_id: z.string(), username: optionalString, role_key: optionalString,
  avatar_url: optionalString, avatar_seed: optionalString, avatar_style: optionalString,
});

export const lobbySchema = z.object({
  id: z.string(), hostId: z.string(), hostUsername: optionalString, hostAvatarUrl: optionalString, hostAvatarSeed: optionalString,
  hostAvatarStyle: optionalString, hostTier: z.number().nullable().optional(), hostTierName: optionalString,
  title: z.string(), mode: squadUpModeSchema, region: z.string(), countryCode: optionalString, area: optionalString,
  minTier: z.number().nullable().optional(), maxTier: z.number().nullable().optional(),
  openSlots: z.number(), acceptedCount: z.number(), wantedRoles: z.array(z.string()), micRequired: z.boolean(),
  status: z.enum(['open', 'full', 'closed']), createdAt: z.string(), myStatus: optionalString, conversationId: optionalString,
  // The server sends accepted members as a JSON string; parse it once here.
  membersJson: z.string().transform((raw) => {
    try { return z.array(acceptedMember).parse(JSON.parse(raw)); } catch { return []; }
  }),
});
export type Lobby = z.infer<typeof lobbySchema>;

export const myLobbiesSchema = z.object({
  hosting: lobbySchema.nullable(),
  members: z.array(lobbyMemberSchema),
  joined: z.array(lobbySchema),
});
export type MyLobbies = z.infer<typeof myLobbiesSchema>;

/** Opening a lobby: what the team still needs. Mode, area and rank come from the player's filters. */
export const createLobbySchema = z.object({
  title: z.string().trim().max(60, 'Keep the title under 60 characters.'),
  openSlots: z.number().int().min(1).max(4),
  wantedRoles: z.array(z.string().regex(/^[a-z_]{1,32}$/)).max(5),
  micRequired: z.boolean(),
});
export type CreateLobbyInput = z.infer<typeof createLobbySchema>;
