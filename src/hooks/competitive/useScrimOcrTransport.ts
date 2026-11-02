import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { scoreboardOcrParseSchema, validateScreenshotFile } from '@/schemas/scoreboardOcrSchema';
import type { OcrTransport } from '@/components/tournament/scoreboard-ocr/ScoreboardOcrFlow';
import { useReportScrimGame, useReportScrimGameFromRiot } from '@/hooks/competitive/useScrimGames';
import type { ScoreboardOcrParse } from '@/types/scoreboardOcr';

/**
 * The screenshot flow of the tournament match room, pointed at a scrim map: the same reader, review
 * and full scoreboard, but read and reported through the scrim's own endpoints.
 */
export function useScrimOcrTransport(sessionId: string, reportedByTeamId: string, gameNumber: number): OcrTransport {
  const report = useReportScrimGame(sessionId);
  const reportRiot = useReportScrimGameFromRiot(sessionId);

  const parse = useMutation({
    mutationFn: async (file: File): Promise<ScoreboardOcrParse> => {
      const invalid = validateScreenshotFile(file);
      if (invalid) throw new Error(invalid);
      const form = new FormData();
      form.append('file', file);
      form.append('reportedByTeamId', reportedByTeamId);
      form.append('gameNumber', String(gameNumber));
      const raw = await apiClient.upload<unknown>(`/api/scrims/sessions/${sessionId}/reports/parse-screenshot`, form);
      const checked = scoreboardOcrParseSchema.safeParse(raw);
      if (!checked.success) throw new Error('The screenshot reader returned something unexpected. Enter the result manually.');
      return checked.data;
    },
  });

  return {
    parse: (file) => parse.mutateAsync(file),
    parsing: parse.isPending,
    parseError: parse.isError ? parse.error : null,
    submitOcr: (submission) => report.mutateAsync({
      gameNumber,
      reportedByTeamId,
      team1Score: submission.team1Score,
      team2Score: submission.team2Score,
      source: 'ocr',
      mapName: submission.mapName,
      mapId: submission.mapId,
      matchData: submission.matchData,
      screenshotUrls: submission.screenshotUrls,
    }),
    submittingOcr: report.isPending,
    submitRiot: (candidate, ctx) => reportRiot.mutateAsync({ candidate, ctx }),
    submittingRiot: reportRiot.isPending,
  };
}
