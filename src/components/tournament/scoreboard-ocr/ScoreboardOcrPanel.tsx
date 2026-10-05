import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GhostButton } from '@/components/ui/app-buttons';
import { InlineNotice } from '@/components/ui/kit';
import { getApiErrorMessage } from '@/lib/apiClient';
import { useScoreboardOcr, useValorantAgents } from '@/hooks/useScoreboardOcr';
import { useSubmitRiotReport } from '@/hooks/useSubmitRiotReport';
import { ocrReviewSchema } from '@/schemas/scoreboardOcrSchema';
import { buildOcrSubmission, draftFromParse, updateDraftPlayer } from '@/services/scoreboardOcr';
import type { OcrDraft, ScoreboardOcrParse, TeamSlot } from '@/types/scoreboardOcr';
import { ScoreboardOcrDropzone } from './ScoreboardOcrDropzone';
import { ScoreboardOcrReview } from './ScoreboardOcrReview';

interface Props {
  matchId: string;
  gameNumber: number;
  reportedByTeamId: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  team1Logo?: string;
  team2Logo?: string;
  mapName?: string;
  mapId?: string;
  onSubmitted: () => void;
  onManual: () => void;
}

/**
 * Upload → read. A screenshot of a game found in Riot's history is reported from Riot straight away;
 * otherwise the captain reviews the read and sends it for the opponent to accept.
 */
export function ScoreboardOcrPanel(props: Props) {
  const { matchId, gameNumber, reportedByTeamId, team1Id, team2Id, team1Name, team2Name, onSubmitted, onManual } = props;
  const reporterSlot: TeamSlot = reportedByTeamId === team2Id ? 'team2' : 'team1';
  const { parse, submit } = useScoreboardOcr(matchId);
  const submitRiot = useSubmitRiotReport(matchId, gameNumber);
  const agents = useValorantAgents(true);
  const [draft, setDraft] = useState<OcrDraft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  /** The screenshot is provably a game in Riot's history: report it from Riot, like Auto-fetch, with no review. */
  const reportFromRiot = async (result: ScoreboardOcrParse): Promise<boolean> => {
    const candidate = result.riot?.confident ? result.riot.candidate : null;
    if (!candidate) return false;
    try {
      await submitRiot.mutateAsync({
        candidate,
        ctx: { gameNumber, userTeamId: reportedByTeamId, team1Id, team2Id, mapId: props.mapId, mapName: props.mapName, screenshotUrls: [result.screenshotUrl] },
      });
      onSubmitted();
      return true;
    } catch (error) {
      setErrors([getApiErrorMessage(error, "The game was found in Riot's history but couldn't be sent. Check the read below and send it.")]);
      return false;
    }
  };

  const read = async (file: File) => {
    setErrors([]);
    try {
      const result = await parse.mutateAsync({ file, reportedByTeamId, gameNumber });
      if (await reportFromRiot(result)) return;
      setDraft(draftFromParse(result, reporterSlot));
    } catch {
      setDraft(null); // message is rendered from parse.error
    }
  };

  const send = async () => {
    if (!draft) return;
    const checked = ocrReviewSchema.safeParse(draft);
    if (!checked.success) {
      setErrors([...new Set(checked.error.issues.map((issue) => issue.message))]);
      return;
    }
    setErrors([]);
    try {
      await submit.mutateAsync(buildOcrSubmission(draft, {
        matchId, gameNumber, reportedByTeamId, reporterSlot, team1Id, team2Id, mapName: props.mapName, mapId: props.mapId,
      }));
      onSubmitted();
    } catch (error) {
      setErrors([getApiErrorMessage(error, 'Could not submit the result. Try again.')]);
    }
  };

  if (draft) {
    return (
      <ScoreboardOcrReview
        draft={draft}
        teamNames={{ team1: team1Name, team2: team2Name }}
        teamLogos={{ team1: props.team1Logo, team2: props.team2Logo }}
        agents={agents.data ?? []}
        errors={errors}
        submitting={submit.isPending}
        onScoreChange={(team, value) => setDraft((d) => (d ? { ...d, uncertainScore: false, [team === 'team1' ? 'team1Score' : 'team2Score']: value } : d))}
        onPlayerChange={(key, patch) => setDraft((d) => (d ? updateDraftPlayer(d, key, patch) : d))}
        onSubmit={send}
        onManual={onManual}
        verification={parse.data?.verification}
      />
    );
  }

  return (
    <div className="space-y-3">
      <ScoreboardOcrDropzone disabled={parse.isPending || submitRiot.isPending} onFile={read} />
      {(parse.isPending || submitRiot.isPending) && (
        <p role="status" className="flex items-center gap-2 text-[13px] text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-rose-400 motion-reduce:animate-none" aria-hidden />
          {submitRiot.isPending
            ? "Found this game in Riot's match history. Sending the result…"
            : "Reading the scoreboard and looking for the game in Riot's match history. This takes a few seconds."}
        </p>
      )}
      {parse.isError && (
        <InlineNotice
          tone="critical"
          title="We couldn't read that screenshot"
          action={<GhostButton type="button" onClick={onManual}>Enter manually</GhostButton>}
        >
          {getApiErrorMessage(parse.error, 'Try a full-screen capture of the Scoreboard tab.')}
        </InlineNotice>
      )}
    </div>
  );
}
