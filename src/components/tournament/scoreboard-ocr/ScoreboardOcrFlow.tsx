import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CtaButton, GhostButton } from '@/components/ui/app-buttons';
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
  /** Scrim context: allow submitting the raw screenshot + score when OCR stats are wrong. */
  onScreenshotOnly?: (url: string, scores: { team1Score: number; team2Score: number; mapName?: string | null }) => Promise<void>;
}

interface ScreenshotOnlyState {
  url: string;
  t1: number | null;
  t2: number | null;
  mapName: string | null | undefined;
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
  const [screenshotOnly, setScreenshotOnly] = useState<ScreenshotOnlyState | null>(null);
  const [screenshotOnlySubmitting, setScreenshotOnlySubmitting] = useState(false);
  const [screenshotOnlyError, setScreenshotOnlyError] = useState<string | null>(null);

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

  const handleScreenshotOnlySubmit = async () => {
    if (!screenshotOnly || screenshotOnly.t1 === null || screenshotOnly.t2 === null || !props.onScreenshotOnly) return;
    setScreenshotOnlySubmitting(true);
    setScreenshotOnlyError(null);
    try {
      await props.onScreenshotOnly(screenshotOnly.url, { team1Score: screenshotOnly.t1, team2Score: screenshotOnly.t2, mapName: screenshotOnly.mapName });
      onSubmitted();
    } catch (error) {
      setScreenshotOnlyError(getApiErrorMessage(error, 'Could not submit. Try again.'));
    } finally {
      setScreenshotOnlySubmitting(false);
    }
  };

  if (screenshotOnly) {
    const canSubmit = screenshotOnly.t1 !== null && screenshotOnly.t2 !== null && !screenshotOnlySubmitting;
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <a href={screenshotOnly.url} target="_blank" rel="noopener noreferrer" className="shrink-0 overflow-hidden border border-white/[0.07] w-20 aspect-video bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400">
            <img src={screenshotOnly.url} alt="Uploaded screenshot" className="h-full w-full object-cover" loading="lazy" />
          </a>
          <p className="text-[13px] leading-relaxed text-zinc-300">Enter the score below. Your screenshot goes to the opponent as evidence — they confirm or dispute.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[13px] text-white/60 truncate max-w-[8rem]">{team1Name}</span>
          <input
            type="number" min="0" max="99" aria-label={`${team1Name} score`}
            className="w-14 rounded bg-white/[0.07] px-2 py-1.5 text-center text-[15px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
            value={screenshotOnly.t1 ?? ''}
            onChange={(e) => setScreenshotOnly((s) => s ? { ...s, t1: e.target.value === '' ? null : Number(e.target.value) } : s)}
          />
          <span className="text-white/40">–</span>
          <input
            type="number" min="0" max="99" aria-label={`${team2Name} score`}
            className="w-14 rounded bg-white/[0.07] px-2 py-1.5 text-center text-[15px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
            value={screenshotOnly.t2 ?? ''}
            onChange={(e) => setScreenshotOnly((s) => s ? { ...s, t2: e.target.value === '' ? null : Number(e.target.value) } : s)}
          />
          <span className="text-[13px] text-white/60 truncate max-w-[8rem]">{team2Name}</span>
        </div>
        {screenshotOnlyError && <InlineNotice tone="critical">{screenshotOnlyError}</InlineNotice>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <GhostButton type="button" onClick={() => setScreenshotOnly(null)} disabled={screenshotOnlySubmitting}>Back to review</GhostButton>
          <CtaButton type="button" onClick={handleScreenshotOnlySubmit} disabled={!canSubmit}>
            {screenshotOnlySubmitting ? 'Sending…' : 'Submit screenshot'}
          </CtaButton>
        </div>
      </div>
    );
  }

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
        onScreenshotOnly={props.onScreenshotOnly
          ? () => setScreenshotOnly({ url: draft.screenshotUrl, t1: draft.team1Score, t2: draft.team2Score, mapName: draft.mapName })
          : undefined}
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
