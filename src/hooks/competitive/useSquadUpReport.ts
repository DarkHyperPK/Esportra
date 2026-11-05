/**
 * useSquadUpReport.ts
 *
 * Reporting a Squad Up player: one multipart request (form fields + up to 5 screenshots), plus the
 * reporter's own report list and hidden-player list. Everything is validated before upload.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { competitiveApiClient as api } from '@/hooks/competitive/competitiveApiClient';
import { validateEvidenceFile } from '@/hooks/competitive/useDisputeEvidenceUpload';
import { apiClient } from '@/lib/apiClient';
import { squadUpKeys } from './queryKeys';
import {
  blockedPlayerSchema, MAX_REPORT_FILES, myReportSchema, reportCreatedSchema, reportFormSchema,
  type ReportFormValues,
} from '@/schemas/squadUpReport';
import type { SquadUpCard } from '@/schemas/squadUp';

const BASE = '/api/competitive/lfg/swipe';

export interface ReportTarget {
  userId: string;
  username: string;
  /** Set when reporting after a match, so admins can see the context. */
  matchId?: string;
}

export interface SubmitReportInput {
  target: ReportTarget;
  form: ReportFormValues;
  files: File[];
}

/** The first problem with the attached screenshots, or null. */
export function validateReportFiles(files: File[]): string | null {
  if (files.length > MAX_REPORT_FILES) return `You can attach up to ${MAX_REPORT_FILES} screenshots.`;
  for (const file of files) {
    const problem = validateEvidenceFile(file);
    if (problem) return `${file.name}: ${problem}`;
  }
  return null;
}

export function buildReportFormData({ target, form, files }: SubmitReportInput): FormData {
  const body = new FormData();
  body.append('reported_user_id', target.userId);
  body.append('reason', form.reason);
  body.append('details', form.details);
  body.append('hide_player', String(form.hidePlayer));
  if (form.proofLink) body.append('proof_link', form.proofLink);
  if (target.matchId) body.append('match_id', target.matchId);
  files.forEach((file) => body.append('files', file));
  return body;
}

export function useSubmitSquadUpReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitReportInput) => {
      const form = reportFormSchema.parse(input.form);
      const fileProblem = validateReportFiles(input.files);
      if (fileProblem) throw new Error(fileProblem);
      return reportCreatedSchema.parse(await apiClient.upload<unknown>(`${BASE}/reports`, buildReportFormData({ ...input, form })));
    },
    onSuccess: (_created, { target }) => {
      // The server already took the player out of the deck; mirror that immediately.
      qc.setQueryData<SquadUpCard[]>(squadUpKeys.cards(), (old) => (old ?? []).filter((card) => card.userId !== target.userId));
      void qc.invalidateQueries({ queryKey: squadUpKeys.reportsMine() });
      void qc.invalidateQueries({ queryKey: squadUpKeys.blocks() });
    },
  });
}

export function useMySquadUpReports(enabled: boolean) {
  return useQuery({
    queryKey: squadUpKeys.reportsMine(),
    enabled,
    queryFn: async () => z.array(myReportSchema).parse(await api.get<unknown>(`${BASE}/reports/mine`)),
    staleTime: 30_000,
  });
}

export function useSquadUpBlocks(enabled: boolean) {
  return useQuery({
    queryKey: squadUpKeys.blocks(),
    enabled,
    queryFn: async () => z.array(blockedPlayerSchema).parse(await api.get<unknown>(`${BASE}/blocks`)),
    staleTime: 30_000,
  });
}

export function useUnhideSquadUpPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`${BASE}/blocks/${userId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: squadUpKeys.blocks() });
      void qc.invalidateQueries({ queryKey: squadUpKeys.cards() });
    },
  });
}
