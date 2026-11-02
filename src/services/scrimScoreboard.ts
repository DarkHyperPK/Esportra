import { draftFromParse } from '@/services/scoreboardOcr/draft';
import type { ScoreboardOcrParse } from '@/types/scoreboardOcr';
import type { ScrimRecentMatch, ScrimScreenshotParseResult } from '@/types/competitive';

type Slot = 'team1' | 'team2';

/** A Riot match as the API returns it: scores from the viewing team's perspective. */
export interface RawRecentMatch {
  id: string;
  map: string;
  mapId?: string | null;
  startTime: number;
  myTeamScore: number;
  enemyTeamScore: number;
  gameLengthMillis?: number | null;
  agent?: string | null;
  kda?: string | null;
}

/** Orient a recent match to the session's team1/team2 so it can fill the report form. */
export function toScrimRecentMatch(raw: RawRecentMatch, mySlot: Slot): ScrimRecentMatch {
  const mine = raw.myTeamScore;
  const theirs = raw.enemyTeamScore;
  return {
    id: raw.id,
    map: raw.map,
    mapId: raw.mapId ?? null,
    startTime: raw.startTime,
    team1Score: mySlot === 'team1' ? mine : theirs,
    team2Score: mySlot === 'team1' ? theirs : mine,
    result: mine > theirs ? 'win' : mine < theirs ? 'loss' : 'draw',
    durationMs: raw.gameLengthMillis ?? null,
    agent: raw.agent ?? null,
    kda: raw.kda ?? null,
  };
}

/** Reduce a scoreboard reading to the two scores the report form needs. */
export function toScrimParseResult(parse: ScoreboardOcrParse, reporterSlot: Slot): ScrimScreenshotParseResult {
  const draft = draftFromParse(parse, reporterSlot);
  const { allyScore, enemyScore } = parse.result;
  const confidence = allyScore.value == null || enemyScore.value == null
    ? null
    : Math.min(allyScore.confidence, enemyScore.confidence);
  return {
    team1Score: draft.team1Score,
    team2Score: draft.team2Score,
    confidence,
    message: draft.uncertainScore ? 'Check the score against your scoreboard before applying.' : null,
  };
}
