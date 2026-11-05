import { z } from 'zod';

export const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or toxic behavior' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'cheating', label: 'Cheating or boosting' },
  { value: 'fake_rank', label: 'Fake or misleading rank' },
  { value: 'spam_scam', label: 'Spam or scam' },
  { value: 'inappropriate_profile', label: 'Inappropriate name or profile' },
  { value: 'other', label: 'Something else' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

export const MAX_REPORT_FILES = 5;
export const MAX_REPORT_DETAILS = 1000;
export const MAX_PROOF_LINK = 500;

const reasonValues = REPORT_REASONS.map((reason) => reason.value) as [ReportReason, ...ReportReason[]];

const isHttps = (value: string) => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

/** What the reporter fills in. Checked before anything is uploaded, and again by the server. */
export const reportFormSchema = z.object({
  reason: z.enum(reasonValues, { message: 'Choose what happened.' }),
  details: z.string().trim().max(MAX_REPORT_DETAILS, `Keep it under ${MAX_REPORT_DETAILS} characters.`),
  proofLink: z.string().trim().max(MAX_PROOF_LINK).refine((value) => value === '' || isHttps(value), 'Use a link that starts with https://'),
  hidePlayer: z.boolean(),
}).superRefine((value, ctx) => {
  if (value.reason === 'other' && value.details.length < 10) {
    ctx.addIssue({ code: 'custom', path: ['details'], message: 'Tell us a little more (at least 10 characters).' });
  }
});
export type ReportFormValues = z.infer<typeof reportFormSchema>;

export const reportCreatedSchema = z.object({ id: z.string() });

export const myReportSchema = z.object({
  id: z.string(),
  reason: z.string(),
  status: z.enum(['open', 'resolved']),
  createdAt: z.string(),
  resolvedAt: z.string().nullable().optional(),
  reportedUsername: z.string().nullable().optional(),
});
export type MyReport = z.infer<typeof myReportSchema>;

export const blockedPlayerSchema = z.object({
  userId: z.string(),
  username: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type BlockedPlayer = z.infer<typeof blockedPlayerSchema>;

export const reasonLabel = (reason: string) => REPORT_REASONS.find((item) => item.value === reason)?.label ?? 'Report';
