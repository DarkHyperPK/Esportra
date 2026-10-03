import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GhostButton } from '@/components/ui/app-buttons';
import { InlineNotice } from '@/components/ui/kit';
import { getApiErrorMessage } from '@/lib/apiClient';
import { useScoreboardOcr, useValorantAgents } from '@/hooks/useScoreboardOcr';
import { ocrReviewSchema } from '@/schemas/scoreboardOcrSchema';
import { buildOcrSubmission, draftFromParse, updateDraftPlayer } from '@/services/scoreboardOcr';
import type { OcrDraft, TeamSlot } from '@/types/scoreboardOcr';
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
  mapName?: string;
  mapId?: string;
  onSubmitted: () => void;
  onManual: () => void;
}

/** Upload → read → captain review → submit as a normal report the opponent must accept. */
export function ScoreboardOcrPanel(props: Props) {
  const { matchId, gameNumber, reportedByTeamId, team1Id, team2Id, team1Name, team2Name, onSubmitted, onManual } = props;
  const reporterSlot: TeamSlot = reportedByTeamId === team2Id ? 'team2' : 'team1';
  const { parse, submit } = useScoreboardOcr(matchId);
  const agents = useValorantAgents(true);
  const [draft, setDraft] = useState<OcrDraft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const read = async (file: File) => {
    setErrors([]);
    try {
      const result = await parse.mutateAsync({ file, reportedByTeamId, gameNumber });
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
        agents={agents.data ?? []}
        errors={errors}
        submitting={submit.isPending}
        onScoreChange={(team, value) => setDraft((d) => (d ? { ...d, uncertainScore: false, [team === 'team1' ? 'team1Score' : 'team2Score']: value } : d))}
        onPlayerChange={(key, patch) => setDraft((d) => (d ? updateDraftPlayer(d, key, patch) : d))}
        onSubmit={send}
        onManual={onManual}
      />
    );
  }

  return (
    <div className="space-y-3">
      <ScoreboardOcrDropzone disabled={parse.isPending} onFile={read} />
      {parse.isPending && (
        <p role="status" className="flex items-center gap-2 text-[13px] text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-rose-400 motion-reduce:animate-none" aria-hidden />
          Reading the scoreboard. This takes a few seconds.
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
