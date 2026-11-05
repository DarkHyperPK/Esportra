import { z } from 'zod';

export const adminRegionSchema = z.object({ region: z.string(), players: z.number(), avgTier: z.number() });
export const adminDaySchema = z.object({
  day: z.string(), sessionsStarted: z.number(), swipesRight: z.number(), swipesLeft: z.number(), matches: z.number(),
  lobbiesOpened: z.number().optional(), lobbiesFilled: z.number().optional(),
});

export const adminOverviewSchema = z.object({
  flag: z.object({ id: z.string(), enabled: z.boolean() }).nullable(),
  live: z.object({
    activePlayers: z.number(), byRegion: z.array(adminRegionSchema),
    competitive: z.number().optional(), unrated: z.number().optional(), openLobbies: z.number().optional(),
  }),
  totals: z.object({
    days: z.number(), sessionsStarted: z.number(), swipesRight: z.number(), swipesLeft: z.number(),
    matches: z.number(), matchRate: z.number(), lobbiesOpened: z.number().optional(), lobbiesFilled: z.number().optional(),
  }),
  series: z.array(adminDaySchema),
  reports: z.object({
    open: z.number(), last7Days: z.number(), avgResolutionHours: z.number(),
    byReason: z.array(z.object({ reason: z.string(), count: z.number() })),
  }).optional(),
});
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type AdminDay = z.infer<typeof adminDaySchema>;

export const adminSessionSchema = z.object({
  userId: z.string(), username: z.string().nullable().optional(), region: z.string(), competitiveTier: z.number().nullable(),
  mode: z.string().optional(), countryCode: z.string().nullable().optional(),
  micOn: z.boolean(), slotsNeeded: z.number(), startedAt: z.string(), lastHeartbeat: z.string(),
  likesSent: z.number(), passesSent: z.number(),
});
export type AdminSession = z.infer<typeof adminSessionSchema>;

export const adminMatchSchema = z.object({
  id: z.string(), matchedAt: z.string(), conversationId: z.string().nullable().optional(),
  user1Id: z.string(), user1Username: z.string().nullable().optional(),
  user2Id: z.string(), user2Username: z.string().nullable().optional(),
});
export type AdminMatch = z.infer<typeof adminMatchSchema>;

export const adminLobbySchema = z.object({
  id: z.string(), hostId: z.string(), hostUsername: z.string().nullable().optional(), title: z.string(), mode: z.string(),
  region: z.string(), countryCode: z.string().nullable().optional(), openSlots: z.number(), status: z.string(), createdAt: z.string(),
  acceptedCount: z.number(), pendingCount: z.number(),
});
export type AdminLobby = z.infer<typeof adminLobbySchema>;

export const REPORT_ACTIONS = ['dismiss', 'warn', 'squad_up_ban', 'suspend'] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];

export const adminReportRowSchema = z.object({
  id: z.string(), reason: z.string(), status: z.enum(['open', 'resolved']), resolution: z.string().nullable().optional(),
  createdAt: z.string(), resolvedAt: z.string().nullable().optional(), reportedId: z.string(),
  reportedUsername: z.string().nullable().optional(), reporterUsername: z.string().nullable().optional(),
  evidenceCount: z.number().optional(), priorActions: z.number().optional(),
});
export type AdminReportRow = z.infer<typeof adminReportRowSchema>;

export const adminReportListSchema = z.object({ total: z.number(), items: z.array(adminReportRowSchema) });

export const adminRestrictionSchema = z.object({
  id: z.string(), userId: z.string(), username: z.string().nullable().optional(), until: z.string().nullable().optional(),
  reasonCategory: z.string(), reportId: z.string().nullable().optional(), createdAt: z.string(),
  createdByUsername: z.string().nullable().optional(),
});
export type AdminRestriction = z.infer<typeof adminRestrictionSchema>;

export const adminReportDetailSchema = z.object({
  report: z.object({
    id: z.string(), reason: z.string(), status: z.enum(['open', 'resolved']), resolution: z.string().nullable().optional(),
    resolutionNote: z.string().nullable().optional(), context: z.string(), details: z.string(), proofLink: z.string().nullable().optional(),
    snapshot: z.record(z.string(), z.unknown()), matchId: z.string().nullable().optional(), createdAt: z.string(),
    resolvedAt: z.string().nullable().optional(), reporterId: z.string().nullable().optional(), reporterUsername: z.string().nullable().optional(),
    reportedId: z.string(), reportedUsername: z.string().nullable().optional(), resolvedByUsername: z.string().nullable().optional(),
  }),
  evidence: z.array(z.object({ id: z.string(), contentType: z.string(), url: z.string().nullable() })),
  history: z.array(adminReportRowSchema),
  restrictions: z.array(adminRestrictionSchema),
});
export type AdminReportDetail = z.infer<typeof adminReportDetailSchema>;

export interface ResolveReportInput {
  action: ReportAction;
  note: string;
  /** Hours for a Squad Up restriction; 0 means permanent. */
  durationHours?: number;
}
