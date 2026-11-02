import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GhostButton } from '@/components/ui/app-buttons';
import { InlineNotice } from '@/components/ui/kit';
import { getApiErrorMessage } from '@/lib/apiClient';
import { useValorantAgents } from '@/hooks/useScoreboardOcr';
import { ocrReviewSchema } from '@/schemas/scoreboardOcrSchema';
import { buildOcrSubmission, draftFromParse, updateDraftPlayer, type OcrReportSubmission } from '@/services/scoreboardOcr';
import type { RiotReportContext } from '@/services/riotReport/riotReport';
import type { RiotMatchCandidate } from '@/types/riotMatchCandidate';
import type { OcrDraft, ScoreboardOcrParse, TeamSlot } from '@/types/scoreboardOcr';
import { ScoreboardOcrDropzone } from './ScoreboardOcrDropzone';
import { ScoreboardOcrReview } from './ScoreboardOcrReview';

/** Where a screenshot is read and where its result is sent: a tournament match or a scrim map. */
export interface OcrTransport {
  parse: (file: File) => Promise<ScoreboardOcrParse>;
  parsing: boolean;
  parseError: unknown;
  submitOcr: (submission: OcrReportSubmission) => Promise<unknown>;
  submittingOcr: boolean;
  submitRiot: (candidate: RiotMatchCandidate, ctx: RiotReportContext) => Promise<unknown>;
  submittingRiot: boolean;
}

interface Props {
  matchId: string;
  transport: OcrTransport;
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
export function ScoreboardOcrFlow(props: Props) {
  const { matchId, transport, gameNumber, reportedByTeamId, team1Id, team2Id, team1Name, team2Name, onSubmitted, onManual } = props;
  const reporterSlot: TeamSlot = reportedByTeamId === team2Id ? 'team2' : 'team1';
  const [verification, setVerification] = useState<ScoreboardOcrParse['verification']>(undefined);
  const agents = useValorantAgents(true);
  const [draft, setDraft] = useState<OcrDraft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  /** The screenshot is provably a game in Riot's history: report it from Riot, like Auto-fetch, with no review. */
  const reportFromRiot = async (result: ScoreboardOcrParse): Promise<boolean> => {
    const candidate = result.riot?.confident ? result.riot.candidate : null;
    if (!candidate) return false;
    try {
      await transport.submitRiot(candidate, { gameNumber, userTeamId: reportedByTeamId, team1Id, team2Id, mapId: props.mapId, mapName: props.mapName, screenshotUrls: [result.screenshotUrl] });
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
      const result = await transport.parse(file);
      setVerification(result.verification);
      if (await reportFromRiot(result)) return;
      setDraft(draftFromParse(result, reporterSlot));
    } catch {
      setDraft(null); // message is rendered from transport.parseError
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
      await transport.submitOcr(buildOcrSubmission(draft, {
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
        submitting={transport.submittingOcr}
        onScoreChange={(team, value) => setDraft((d) => (d ? { ...d, uncertainScore: false, [team === 'team1' ? 'team1Score' : 'team2Score']: value } : d))}
        onPlayerChange={(key, patch) => setDraft((d) => (d ? updateDraftPlayer(d, key, patch) : d))}
        onSubmit={send}
        onManual={onManual}
        verification={verification}
      />
    );
  }

  return (
    <div className="space-y-3">
      <ScoreboardOcrDropzone disabled={transport.parsing || transport.submittingRiot} onFile={read} />
      {(transport.parsing || transport.submittingRiot) && (
        <p role="status" className="flex items-center gap-2 text-[13px] text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-rose-400 motion-reduce:animate-none" aria-hidden />
          {transport.submittingRiot
            ? "Found this game in Riot's match history. Sending the result…"
            : "Reading the scoreboard and looking for the game in Riot's match history. This takes a few seconds."}
        </p>
      )}
      {!!transport.parseError && (
        <InlineNotice
          tone="critical"
          title="We couldn't read that screenshot"
          action={<GhostButton type="button" onClick={onManual}>Enter manually</GhostButton>}
        >
          {getApiErrorMessage(transport.parseError, 'Try a full-screen capture of the Scoreboard tab.')}
        </InlineNotice>
      )}
    </div>
  );
}
