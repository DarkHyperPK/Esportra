import { z } from 'zod';

export const createShowSchema = z.object({
  title: z
    .string()
    .min(2, 'Show title must be at least 2 characters')
    .max(120, 'Show title cannot exceed 120 characters'),
  tournamentId: z.string().uuid().optional().or(z.literal('')),
  scheduledAt: z.string().optional().or(z.literal('')),
});

export type CreateShowInput = z.infer<typeof createShowSchema>;

export const addShowMatchSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
  matchCode: z.string().max(20, 'Match code cannot exceed 20 characters').optional(),
  displayOrder: z.number().int().nonnegative().optional(),
});

export type AddShowMatchInput = z.infer<typeof addShowMatchSchema>;

export const createCrewInviteSchema = z.object({
  role: z.string().min(1, 'Role is required'),
});

export type CreateCrewInviteInput = z.infer<typeof createCrewInviteSchema>;

export const addSponsorSchema = z.object({
  name: z
    .string()
    .min(1, 'Sponsor name is required')
    .max(80, 'Sponsor name cannot exceed 80 characters'),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
  displaySlot: z.string().min(1, 'Display slot is required'),
  isActive: z.boolean().default(true),
});

export type AddSponsorInput = z.infer<typeof addSponsorSchema>;

export const editSponsorSchema = addSponsorSchema.extend({
  id: z.string().uuid(),
});

export type EditSponsorInput = z.infer<typeof editSponsorSchema>;

export const addSegmentSchema = z.object({
  type: z.enum(['match', 'break', 'pre_show', 'post_show', 'sponsor_slot', 'custom']),
  title: z.string().min(1, 'Segment title is required').max(120, 'Too long'),
  estimatedDuration: z.string().max(20).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  displayOrder: z.number().int().nonnegative().optional(),
});

export type AddSegmentInput = z.infer<typeof addSegmentSchema>;

export const updateSegmentSchema = addSegmentSchema.partial().extend({
  id: z.string(),
});

export type UpdateSegmentInput = z.infer<typeof updateSegmentSchema>;

// ── P4 response schemas ───────────────────────────────────────────────────────

const sponsorSlotBreakdownSchema = z.object({
  totalSeconds: z.number(),
  count: z.number(),
});

export const sponsorProofSponsorSchema = z.object({
  sponsorId: z.string(),
  name: z.string(),
  totalOnAirSeconds: z.number(),
  placementCount: z.number(),
  bySlotType: z.record(z.string(), sponsorSlotBreakdownSchema),
  hasIncomplete: z.boolean(),
  incompleteCount: z.number(),
});

export const sponsorProofResponseSchema = z.object({
  showId: z.string(),
  showTitle: z.string(),
  generatedAt: z.string(),
  sponsors: z.array(sponsorProofSponsorSchema),
});

const segmentTypeSchema = z.enum([
  'match', 'break', 'pre_show', 'post_show', 'sponsor_slot', 'custom',
]);

export const vodChapterSchema = z.object({
  segmentId: z.string(),
  segmentName: z.string(),
  segmentType: segmentTypeSchema,
  offsetSeconds: z.number(),
  durationSeconds: z.number().nullable(),
  incomplete: z.boolean(),
});

export const vodChaptersApiResponseSchema = z.object({
  showId: z.string(),
  chapters: z.array(vodChapterSchema),
});

const reportMapScoreSchema = z.object({
  mapNumber: z.number(),
  teamAScore: z.number().nullable(),
  teamBScore: z.number().nullable(),
  source: z.enum(['gep', 'manual', 'captain']),
});

const reportMatchSchema = z.object({
  matchId: z.string(),
  matchCode: z.string(),
  displayOrder: z.number(),
  status: z.string(),
  maps: z.array(reportMapScoreSchema),
});

const reportCrewSchema = z.object({
  userId: z.string(),
  displayName: z.string().nullable(),
  role: z.string(),
});

const reportSponsorSchema = sponsorProofSponsorSchema;

const reportChapterSchema = vodChapterSchema;

const reportPlayerSchema = z.object({
  matchId: z.string(),
  matchCode: z.string().nullable(),
  userId: z.string(),
  displayName: z.string().nullable(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
});

export const postShowReportSchema = z.object({
  show: z.object({
    id: z.string(),
    title: z.string(),
    scheduledAt: z.string().nullable(),
    startedAt: z.string().nullable(),
    endedAt: z.string().nullable(),
    durationSeconds: z.number(),
  }),
  matches: z.array(reportMatchSchema),
  crew: z.array(reportCrewSchema),
  sponsors: z.array(reportSponsorSchema),
  chapters: z.array(reportChapterSchema),
  corrections: z.object({ count: z.number() }),
  players: z.array(reportPlayerSchema),
});
