import type { z } from 'zod';
import type { coachTeamSchema, coachUserRowSchema, highlightSchema, playerRowSchema, scrimPlayerReportSchema, scrimTeamReportSchema } from '@/schemas/scrimReport';

export type ScrimTeamReport = z.infer<typeof scrimTeamReportSchema>;
export type TeamReportBody = ScrimTeamReport['report'];
export type ScrimPlayerReport = z.infer<typeof scrimPlayerReportSchema>;
export type PlayerReportBody = NonNullable<ScrimPlayerReport['report']>;
export type ReportHighlight = z.infer<typeof highlightSchema>;
export type ReportPlayerRow = z.infer<typeof playerRowSchema>;
export type Rate = TeamReportBody['attack'];
export type CoachTeam = z.infer<typeof coachTeamSchema>;
export type CoachUserRow = z.infer<typeof coachUserRowSchema>;
