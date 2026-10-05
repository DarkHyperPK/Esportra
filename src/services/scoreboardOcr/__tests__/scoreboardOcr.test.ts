import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({ apiClient: {} }));
import { scoreboardOcrParseSchema, ocrReviewSchema, validateScreenshotFile } from '@/schemas/scoreboardOcrSchema';
import { buildOcrSubmission, draftFromParse, updateDraftPlayer } from '@/services/scoreboardOcr';
import { resolveStoredEnrichedMatch } from '@/hooks/useRiotGameDetails';
import { visibleStats } from '@/components/tournament/scoreboard-ocr/reviewStats';
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

describe('draftFromParse — elimination method', () => {
  it('uses matchedName as the initial name for elimination rows', () => {
    const p = parse();
    const players = [...p.result.players];
    players[0] = {
      ...players[0],
      name: { value: null, confidence: 0 },
      rosterMatch: { userId: 'u-elim', team: 'team2', matchedName: 'EliminatedPlayer', score: 1, method: 'elimination' },
    };
    const draft = draftFromParse({ ...p, result: { ...p.result, players } }, 'team1');
    expect(draft.players[0].name).toBe('EliminatedPlayer');
    expect(draft.players[0].rosterMatchMethod).toBe('elimination');
    expect(draft.players[0].nameConfidence).toBe(0);
  });

  it('carries rosterMatchMethod and nameConfidence for normal read rows', () => {
    const draft = draftFromParse(parse(), 'team1');
    expect(draft.players[0].rosterMatchMethod).toBe('read');
    expect(draft.players[0].nameConfidence).toBe(0.99);
  });

  it('defaults rosterMatchMethod to read when no rosterMatch is present', () => {
    const p = parse();
    const players = [...p.result.players];
    players[0] = { ...players[0], rosterMatch: null };
    const draft = draftFromParse({ ...p, result: { ...p.result, players } }, 'team1');
    expect(draft.players[0].rosterMatchMethod).toBe('read');
  });

  it('falls back to empty string name when elimination row has no matchedName', () => {
    const p = parse();
    const players = [...p.result.players];
    players[0] = {
      ...players[0],
      name: { value: null, confidence: 0 },
      rosterMatch: { userId: 'u-elim', team: 'team2', matchedName: '', score: 0, method: 'elimination' },
    };
    const draft = draftFromParse({ ...p, result: { ...p.result, players } }, 'team1');
    expect(draft.players[0].name).toBe('');
    expect(draft.players[0].rosterMatchMethod).toBe('elimination');
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

describe('real client layout (KDA, first bloods, plants, defuses — no ACS)', () => {
  const realRow = (name: string, side: 'ally' | 'enemy', k: number, d: number, a: number): OcrPlayerRow => ({
    side,
    sideConfidence: 0.95,
    name: sure(name),
    rosterMatch: { userId: `u-${name}`, team: side === 'ally' ? 'team1' : 'team2', matchedName: name, score: 1 },
    agent: { value: null, confidence: 0 },
    stats: { kills: sure(k), deaths: sure(d), assists: sure(a), firstBloods: sure(1), plants: sure(2), defuses: sure(0) },
  });
  const real = (): ScoreboardOcrParse => {
    const base = parse();
    return {
      ...base,
      result: {
        ...base.result,
        allyTeam: sure('team1'),
        allyScore: sure(13),
        enemyScore: sure(5),
        columns: ['assists', 'deaths', 'defuses', 'firstBloods', 'kills', 'plants'],
        players: [
          ...['tr1ck', 'Kenshiro', 'Cryogeyser', 'dem0nzx', 'expired pickle'].map((n, i) => realRow(n, 'ally', 20 - i, 7 + i, 3)),
          ...['LAGGING', 'AHK', 'osa1d', 'Shini', 'X'].map((n, i) => realRow(n, 'enemy', 13 - i, 14 + i, 1)),
        ],
      },
    };
  };

  it('never invents ACS and shows the columns the screenshot had', () => {
    const draft = draftFromParse(real(), 'team1');
    expect(draft.columns).not.toContain('acs');
    expect(visibleStats(draft.columns).map((s) => s.label)).toEqual(['K', 'D', 'A', 'FK', 'PL', 'DF']);

    const submission = buildOcrSubmission(draft, {
      matchId: 'm', gameNumber: 1, reportedByTeamId: 't1', reporterSlot: 'team1', team1Id: 't1', team2Id: 't2',
    });
    const first = submission.matchData.players?.[0];
    expect(first).toMatchObject({ kills: 20, deaths: 7, assists: 3, firstBloods: 1 });
    expect(first?.acs).toBeUndefined();
    expect(first?.score).toBeUndefined();
  });

  it('still shows K/D/A/FK when the reader found no stat columns', () => {
    expect(visibleStats([]).map((s) => s.key)).toEqual(['kills', 'deaths', 'assists', 'firstBloods']);
  });
});
