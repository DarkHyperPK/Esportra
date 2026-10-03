import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/apiClient';
import { scoreboardOcrResultSchema, validateScreenshotFile } from '@/schemas/scoreboardOcrSchema';
import type { ScoreboardOcrDebugResponse, ScoreboardOcrHealth } from '@/types/scoreboardOcr';

const debugResponseSchema = z.object({ elapsedMs: z.number(), result: scoreboardOcrResultSchema });
const healthSchema = z.object({ configured: z.boolean(), reachable: z.boolean(), agents: z.number() });

export const scoreboardOcrHealthKey = ['scoreboard-ocr-debug', 'health'] as const;

interface DebugParseParams {
  file: File;
  team1Names: string;
  team2Names: string;
}

/** Staff OCR test bench: read any screenshot without a match; the API stores nothing. */
export function useScoreboardOcrDebug() {
  const health = useQuery({
    queryKey: scoreboardOcrHealthKey,
    queryFn: async (): Promise<ScoreboardOcrHealth> =>
      healthSchema.parse(await apiClient.get<unknown>('/api/debug/scoreboard-ocr/health')),
    staleTime: 30_000,
    retry: false,
  });

  const parse = useMutation({
    mutationFn: async ({ file, team1Names, team2Names }: DebugParseParams): Promise<ScoreboardOcrDebugResponse> => {
      const invalid = validateScreenshotFile(file);
      if (invalid) throw new Error(invalid);
      const form = new FormData();
      form.append('file', file);
      form.append('team1Names', team1Names);
      form.append('team2Names', team2Names);
      const raw = await apiClient.upload<unknown>('/api/debug/scoreboard-ocr', form);
      const checked = debugResponseSchema.safeParse(raw);
      if (!checked.success) throw new Error('The OCR service returned a result this page does not understand.');
      return checked.data;
    },
  });

  return { health, parse };
}
