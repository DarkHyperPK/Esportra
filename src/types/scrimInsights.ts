import type { z } from 'zod';
import type { reportSchema, scrimGameInsightsSchema } from '@/schemas/scrimInsights';

/** The per-map scrim report, as the API returns it (camelCased by the API client). Opponents appear by name for this one match only. */
export type ScrimGameInsights = z.infer<typeof scrimGameInsightsSchema>;
export type InsightsReport = NonNullable<ScrimGameInsights['report']>;
export type ReportPlayer = z.infer<typeof reportSchema>['players'][number];
export type ReportRound = z.infer<typeof reportSchema>['rounds'][number];
export type ReportKill = z.infer<typeof reportSchema>['kills'][number];
export type Rate = z.infer<typeof reportSchema>['halves']['first'];
