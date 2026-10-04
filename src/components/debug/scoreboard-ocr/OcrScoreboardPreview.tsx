import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { HINT_CLASS, InlineNotice, LABEL_CLASS } from '@/components/ui/kit';
import { MatchGameStatisticsPanel } from '@/components/tournament/MatchGameStatisticsPanel';
import { buildOcrSubmission, countRecognisedAgents, draftFromParse } from '@/services/scoreboardOcr';
import type { ScoreboardOcrResult } from '@/types/scoreboardOcr';

interface Props {
  result: ScoreboardOcrResult;
  imageUrl: string;
  /** Agents the OCR service learned from game portraits; null while health is unknown. */
  bankAgents: number | null;
}

const FIELD = 'h-9 rounded-none border-white/10 bg-black/30 text-sm text-white';

function agentNote(recognised: number, rows: number, bankAgents: number | null): { tone: 'neutral' | 'warning'; text: string } {
  if (bankAgents === 0) {
    return { tone: 'warning', text: 'The OCR service has no learned agent portraits; redeploy the latest image.' };
  }
  if (recognised < rows) {
    return { tone: 'warning', text: `Agents recognised on ${recognised} of ${rows} rows. Rows without an agent show the name only; captains pick the agent in review.` };
  }
  return { tone: 'neutral', text: `All ${rows} agents recognised.` };
}

/** The match stats exactly as players see them once the opponent accepts this screenshot report. */
export function OcrScoreboardPreview({ result, imageUrl, bankAgents }: Props) {
  const [names, setNames] = useState({ team1: 'Team 1', team2: 'Team 2' });
  const submission = useMemo(() => {
    const draft = draftFromParse({ parseId: 'debug', screenshotUrl: imageUrl, mapId: null, team1Id: 'team1', team2Id: 'team2', result }, 'team1');
    return buildOcrSubmission(draft, { matchId: 'debug', gameNumber: 1, reportedByTeamId: 'team1', reporterSlot: 'team1', team1Id: 'team1', team2Id: 'team2' });
  }, [imageUrl, result]);
  const recognised = countRecognisedAgents(result);
  const note = agentNote(recognised, result.players.length, bankAgents);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {(['team1', 'team2'] as const).map((team) => (
          <label key={team} className="space-y-1.5">
            <span className={LABEL_CLASS}>{team === 'team1' ? 'Team 1 name' : 'Team 2 name'}</span>
            <Input value={names[team]} onChange={(event) => setNames((n) => ({ ...n, [team]: event.target.value }))} className={FIELD} />
          </label>
        ))}
        <p className={`${HINT_CLASS} sm:col-span-2`}>
          Team 1 is the screenshot owner's side unless the rosters say otherwise. This is the view players get after the opponent accepts.
        </p>
      </div>
      <InlineNotice tone={note.tone}>{note.text}</InlineNotice>
      <MatchGameStatisticsPanel
        details={submission.matchData}
        team1Name={names.team1 || 'Team 1'}
        team2Name={names.team2 || 'Team 2'}
        team1Id="team1"
        team2Id="team2"
        team1Score={submission.team1Score}
        team2Score={submission.team2Score}
        mapName={submission.mapName}
        reportedByTeamId="team1"
        fetchLive={false}
        showShareCards
        captainRoomMode
        isOrganizer
      />
    </div>
  );
}
