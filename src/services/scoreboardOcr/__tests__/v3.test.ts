import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({ apiClient: {} }));
import { ocrReviewSchema, scoreboardOcrParseSchema } from '@/schemas/scoreboardOcrSchema';
import { buildOcrSubmission, draftFromParse } from '@/services/scoreboardOcr';
import { agentIconUrl } from '@/components/tournament/fullScoreboardConstants';

const sure = <T,>(value: T) => ({ value, confidence: 0.97 });

const raw = {
  parseId: '11111111-1111-4111-8111-111111111111',
  screenshotUrl: 'https://cdn.example.com/p.png',
  mapId: null,
  team1Id: '33333333-3333-4333-8333-333333333333',
  team2Id: '44444444-4444-4444-8444-444444444444',
  result: {
    game: 'valorant', parserVersion: 'valorant-scoreboard-v3', engineVersion: 'rapidocr-3.9.2/pp-ocr',
    outcome: sure('victory'), allyScore: sure(13), enemyScore: sure(6),
    map: sure({ name: 'Summit' }), playedOn: sure('2026-10-03'), captureStretch: 1.0,
    allyTeam: sure('team1'), columns: ['acs', 'kills', 'deaths', 'assists', 'trades'],
    players: [{
      side: 'ally', sideConfidence: 0.9, name: sure('LostMyChill'), nameRead: 'LostMyChill',
      rosterMatch: { userId: 'u1', team: 'team1', matchedName: 'LostMyChill', score: 1, source: 'riot_verified', method: 'read' },
      agent: sure({ uuid: null, name: 'Miks' }),
      stats: { acs: sure(442), kills: sure(31), deaths: sure(17), assists: sure(8), trades: sure(5) },
    }],
    warnings: [],
  },
  verification: {
    players: [{ index: 0, name: 'LostMyChill', team: 'team1', userId: 'u1', status: 'verified', source: 'riot_verified', readName: 'LostMyChill' }],
    flags: [],
  },
};

describe('scoreboard OCR v3 wire format', () => {
  it('accepts verification, trades, the match date and agents valorant-api does not list yet', () => {
    const parsed = scoreboardOcrParseSchema.parse(raw);
    expect(parsed.verification?.players[0].status).toBe('verified');
    expect(parsed.result.players[0].agent.value).toEqual({ uuid: null, name: 'Miks' });
    expect(parsed.result.players[0].stats.trades?.value).toBe(5);
  });

  it('keeps the agent name and trades through to the submitted scoreboard', () => {
    const draft = draftFromParse(scoreboardOcrParseSchema.parse(raw), 'team1');
    expect(draft.players[0]).toMatchObject({ agentId: null, agentName: 'Miks' });
    const submission = buildOcrSubmission(draft, { matchId: 'm', gameNumber: 1, reportedByTeamId: 't1', reporterSlot: 'team1', team1Id: 't1', team2Id: 't2' });
    expect(submission.matchData.players?.[0]).toMatchObject({ agentName: 'Miks', trades: 5, acs: 442 });
  });

  it('allows a 4v5 scoreboard but never six on a side', () => {
    const player = (team: 'team1' | 'team2') => ({ team, name: 'x', stats: {} });
    const fourFive = [...Array(4)].map(() => player('team1')).concat([...Array(5)].map(() => player('team2')));
    expect(ocrReviewSchema.safeParse({ team1Score: 13, team2Score: 7, players: fourFive }).success).toBe(true);
    const sixFour = [...Array(6)].map(() => player('team1')).concat([...Array(4)].map(() => player('team2')));
    expect(ocrReviewSchema.safeParse({ team1Score: 13, team2Score: 7, players: sixFour }).success).toBe(false);
  });

  it('serves bundled icons for agents valorant-api does not list yet', () => {
    expect(agentIconUrl('abc')).toContain('media.valorant-api.com/agents/abc');
    expect(agentIconUrl(null, 'Miks')).toBe('/agents/miks.png');
    expect(agentIconUrl(null, 'Unknown')).toBeNull();
  });
});
