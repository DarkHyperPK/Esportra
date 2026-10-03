import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({ apiClient: {} }));
import { scoreboardOcrParseSchema, ocrReviewSchema, validateScreenshotFile } from '@/schemas/scoreboardOcrSchema';
import { buildOcrSubmission, draftFromParse, updateDraftPlayer } from '@/services/scoreboardOcr';
import { resolveStoredEnrichedMatch } from '@/hooks/useRiotGameDetails';
import type { OcrPlayerRow, ScoreboardOcrParse } from '@/types/scoreboardOcr';

const sure = <T,>(value: T) => ({ value, confidence: 0.99 });

function row(name: string, side: 'ally' | 'enemy' | null, acs: number, k: number, d: number, team?: 'team1' | 'team2'): OcrPlayerRow {
  return {
    side,
    sideConfidence: side ? 0.95 : 0,
    name: sure(name),
    rosterMatch: team ? { userId: `u-${name}`, team, matchedName: name, score: 1 } : null,
    agent: sure({ uuid: `agent-${name}`, name: 'Jett', role: 'Duelist' }),
    stats: { acs: sure(acs), kills: sure(k), deaths: sure(d), assists: sure(3), firstBloods: { value: 1, confidence: 0.4 } },
  };
}

function parse(overrides: Partial<ScoreboardOcrParse['result']> = {}): ScoreboardOcrParse {
  const allies = ['A1', 'A2', 'A3', 'A4', 'A5'].map((n, i) => row(n, 'ally', 300 - i * 20, 15 - i, 8, 'team2'));
  const enemies = ['E1', 'E2', 'E3', 'E4', 'E5'].map((n, i) => row(n, 'enemy', 200 - i * 20, 8 - i, 14, 'team1'));
  return {
    parseId: '11111111-1111-4111-8111-111111111111',
    screenshotUrl: 'https://cdn.example.com/storage/v1/object/public/tournaments.results/matches/m/ocr/p.png',
    mapId: '22222222-2222-4222-8222-222222222222',
    team1Id: '33333333-3333-4333-8333-333333333333',
    team2Id: '44444444-4444-4444-8444-444444444444',
    result: {
      game: 'valorant',
      parserVersion: 'valorant-scoreboard-v1',
      engineVersion: 'rapidocr-3.9.2/pp-ocr',
      outcome: sure('victory'),
      allyScore: sure(13),
      enemyScore: sure(9),
      map: sure({ name: 'Ascent', uuid: 'map-uuid', mapUrl: '/Game/Maps/Ascent/Ascent' }),
      allyTeam: sure('team2'),
      columns: ['acs', 'kills', 'deaths', 'assists', 'firstBloods'],
      players: [...allies, ...enemies],
      warnings: [],
      ...overrides,
    },
  };
}

describe('scoreboardOcrParseSchema', () => {
  it('accepts a service response and normalizes missing values to null', () => {
    const raw = parse();
    const json = JSON.parse(JSON.stringify({ ...raw, result: { ...raw.result, outcome: { confidence: 0 } } }));
    const parsed = scoreboardOcrParseSchema.parse(json);
    expect(parsed.result.outcome.value).toBeNull();
  });

  it('rejects responses that are not a scoreboard', () => {
    expect(scoreboardOcrParseSchema.safeParse({ parseId: 'x' }).success).toBe(false);
  });
});

describe('draftFromParse', () => {
  it('maps ally/enemy to bracket teams using the reader’s team vote', () => {
    const draft = draftFromParse(parse(), 'team1');
    expect(draft.team1Score).toBe(9);
    expect(draft.team2Score).toBe(13);
    expect(draft.players.filter((p) => p.team === 'team2')).toHaveLength(5);
    expect(draft.uncertainScore).toBe(false);
  });

  it('falls back to the reporter’s team as the ally side and flags the score', () => {
    const draft = draftFromParse(parse({ allyTeam: { value: null, confidence: 0 } }), 'team1');
    expect(draft.team1Score).toBe(13);
    expect(draft.uncertainScore).toBe(true);
  });

  it('flags low-confidence cells, unknown sides and team disagreements', () => {
    const p = parse();
    const players = [...p.result.players];
    players[0] = { ...players[0], side: null };
    players[1] = { ...players[1], rosterMatch: { userId: 'x', team: 'team1', matchedName: 'A2', score: 0.9 } };
    const draft = draftFromParse({ ...p, result: { ...p.result, players } }, 'team2');
    expect(draft.players[0].team).toBeNull();
    expect(draft.players[0].uncertain).toContain('team');
    expect(draft.players[1].uncertain).toContain('team');
    expect(draft.players[2].uncertain).toEqual(['firstBloods']);
  });
});

describe('updateDraftPlayer', () => {
  it('updates immutably and clears the edited field’s highlight', () => {
    const draft = draftFromParse(parse(), 'team1');
    const next = updateDraftPlayer(draft, 'row-2', { stat: ['firstBloods', 2] });
    expect(next).not.toBe(draft);
    expect(draft.players[2].stats.firstBloods).toBe(1);
    expect(next.players[2].stats.firstBloods).toBe(2);
    expect(next.players[2].uncertain).not.toContain('firstBloods');
  });
});

describe('ocrReviewSchema', () => {
  it('requires 5 players per team and a decisive score', () => {
    const draft = draftFromParse(parse(), 'team1');
    expect(ocrReviewSchema.safeParse(draft).success).toBe(true);
    expect(ocrReviewSchema.safeParse({ ...draft, team1Score: 13, team2Score: 13 }).success).toBe(false);
    const unbalanced = updateDraftPlayer(draft, 'row-0', { team: 'team1' });
    expect(ocrReviewSchema.safeParse(unbalanced).success).toBe(false);
  });
});

describe('buildOcrSubmission', () => {
  const ctx = {
    matchId: 'match-1',
    gameNumber: 2,
    reportedByTeamId: '44444444-4444-4444-8444-444444444444',
    reporterSlot: 'team2' as const,
    team1Id: '33333333-3333-4333-8333-333333333333',
    team2Id: '44444444-4444-4444-8444-444444444444',
  };

  it('produces a report the existing scoreboard views can read back', () => {
    const submission = buildOcrSubmission(draftFromParse(parse(), 'team2'), ctx);
    expect(submission).toMatchObject({ team1Score: 9, team2Score: 13, winnerTeamId: ctx.team2Id, source: 'ocr', gameNumber: 2 });
    expect(submission.screenshotUrls).toHaveLength(1);
    expect(submission.matchData.t1Side).toBe('Blue');
    expect(submission.matchData.reporterSide).toBe('Red');

    const snapshot = resolveStoredEnrichedMatch(submission.matchData);
    expect(snapshot?.ocrSource).toEqual({ parseId: submission.ocrParseId, matchId: 'match-1' });
    expect(snapshot?.teams.find((t) => t.teamId === 'Red')?.won).toBe(true);
    const top = snapshot?.enrichedPlayers?.find((p) => p.gameName === 'A1');
    expect(top).toMatchObject({ acs: 300, kills: 15, teamId: 'Red', score: 300 * 22, roundsPlayed: 22, userId: 'u-A1' });
    expect(top?.hsPct).toBeUndefined();
  });
});

describe('validateScreenshotFile', () => {
  it('accepts screenshots and rejects other files', () => {
    expect(validateScreenshotFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
    expect(validateScreenshotFile(new File(['x'], 'a.gif', { type: 'image/gif' }))).not.toBeNull();
    expect(validateScreenshotFile(new File(['x'], 'a.png', { type: 'image/svg+xml' }))).not.toBeNull();
  });
});
