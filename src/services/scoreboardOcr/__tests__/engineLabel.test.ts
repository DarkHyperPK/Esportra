import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({ apiClient: {} }));
import { buildOcrSubmission, countRecognisedAgents, describeOcrEngine, draftFromParse } from '@/services/scoreboardOcr';
import { resolveStoredEnrichedMatch } from '@/hooks/useRiotGameDetails';
import type { OcrPlayerRow, ScoreboardOcrResult } from '@/types/scoreboardOcr';

const sure = <T,>(value: T) => ({ value, confidence: 0.99 });

function row(index: number, side: 'ally' | 'enemy', agent: boolean): OcrPlayerRow {
  return {
    side,
    sideConfidence: 0.95,
    name: sure(`P${index}`),
    rosterMatch: null,
    agent: agent ? sure({ uuid: `agent-${index}`, name: 'Jett' }) : { value: null, confidence: 0 },
    stats: { kills: sure(10 + index), deaths: sure(8), assists: sure(3) },
  };
}

function result(agentRows = 10): ScoreboardOcrResult {
  return {
    game: 'valorant',
    parserVersion: 'valorant-scoreboard-v2',
    engineVersion: 'rapidocr-3.9.2/pp-ocr',
    outcome: sure('victory'),
    allyScore: sure(13),
    enemyScore: sure(7),
    map: sure({ name: 'Lotus', uuid: 'map', mapUrl: '/Game/Maps/Jam/Jam' }),
    allyTeam: { value: null, confidence: 0 },
    columns: ['kills', 'deaths', 'assists'],
    players: Array.from({ length: 10 }, (_, i) => row(i, i < 5 ? 'ally' : 'enemy', i < agentRows)),
    warnings: [],
  };
}

describe('describeOcrEngine', () => {
  it('names the PaddleOCR models behind the RapidOCR runtime', () => {
    expect(describeOcrEngine('rapidocr-3.9.2/pp-ocr')).toBe('PaddleOCR (PP-OCR) via RapidOCR · v3.9.2');
  });

  it('passes unknown engines through unchanged', () => {
    expect(describeOcrEngine('paddleocr-3.0')).toBe('paddleocr-3.0');
  });
});

describe('countRecognisedAgents', () => {
  it('counts only confident agent reads', () => {
    expect(countRecognisedAgents(result(10))).toBe(10);
    expect(countRecognisedAgents(result(6))).toBe(6);
  });
});

describe('debug scoreboard preview snapshot', () => {
  it('renders as a Riot-style snapshot with agents and the owner on team 1', () => {
    const draft = draftFromParse({ parseId: 'debug', screenshotUrl: 'blob:x', mapId: null, team1Id: 'team1', team2Id: 'team2', result: result() }, 'team1');
    const submission = buildOcrSubmission(draft, { matchId: 'debug', gameNumber: 1, reportedByTeamId: 'team1', reporterSlot: 'team1', team1Id: 'team1', team2Id: 'team2' });
    const snapshot = resolveStoredEnrichedMatch(submission.matchData);
    expect(snapshot?.players).toHaveLength(10);
    expect(snapshot?.players.map((p) => p.characterId)).toEqual(Array.from({ length: 10 }, (_, i) => `agent-${i}`));
    expect(snapshot?.players.slice(0, 5).every((p) => p.teamId === 'Blue')).toBe(true);
    expect([submission.team1Score, submission.team2Score]).toEqual([13, 7]);
  });
});
