import { useState } from 'react';
import { InlineNotice } from '@/components/ui/kit';
import { ScoreboardOcrReview } from '@/components/tournament/scoreboard-ocr/ScoreboardOcrReview';
import { useValorantAgents } from '@/hooks/useScoreboardOcr';
import { draftFromParse, updateDraftPlayer } from '@/services/scoreboardOcr';
import type { OcrDraft, OcrVerification, ScoreboardOcrResult } from '@/types/scoreboardOcr';

/** What a captain would see in the match room for this screenshot (edits stay local, nothing is sent). */
export function OcrReviewPreview({ result, imageUrl, verification }: { result: ScoreboardOcrResult; imageUrl: string; verification?: OcrVerification | null }) {
  const agents = useValorantAgents(true);
  const [draft, setDraft] = useState<OcrDraft>(() =>
    draftFromParse({ parseId: 'debug', screenshotUrl: imageUrl, mapId: null, team1Id: 'team1', team2Id: 'team2', result }, 'team1'),
  );
  return (
    <div className="space-y-3">
      <InlineNotice tone="neutral">Preview only. Team 1 is assumed to be the uploader's team when names don't decide it.</InlineNotice>
      <ScoreboardOcrReview
        draft={draft}
        teamNames={{ team1: 'Team 1', team2: 'Team 2' }}
        agents={agents.data ?? []}
        errors={[]}
        submitting={false}
        readOnly
        onScoreChange={(team, value) => setDraft((d) => ({ ...d, uncertainScore: false, [team === 'team1' ? 'team1Score' : 'team2Score']: value }))}
        onPlayerChange={(key, patch) => setDraft((d) => updateDraftPlayer(d, key, patch))}
        onSubmit={() => undefined}
        onManual={() => undefined}
        verification={verification}
      />
    </div>
  );
}
