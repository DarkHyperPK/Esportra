import { describe, expect, it } from 'vitest';
import { compareWithRiot, reviewCheck } from '@/services/scoreboardOcr';
import { scoreboardOcrParseSchema } from '@/schemas/scoreboardOcrSchema';
import type { OcrPlayerRow, RiotMatchPlayer, RiotMatchSummary, ScoreboardOcrResult } from '@/types/scoreboardOcr';

const field = <T,>(value: T | null, confidence = 0.95) => ({ value, confidence });

function row(name: string | null, side: 'ally' | 'enemy', kda: [number, number, number], conf = 0.95): OcrPlayerRow {
  return {
    side,
    sideConfidence: 1,
    name: field(name, name ? 0.95 : 0),
    nameRead: name,
    agent: field({ uuid: 'agent-read', name: 'Jett' }),
    stats: { kills: field(kda[0], conf), deaths: field(kda[1], conf), assists: field(kda[2], conf), trades: field(3) },
  };
}

function riotPlayer(name: string, tag: string, team: 'team1' | 'team2', kda: [number, number, number]): RiotMatchPlayer {
  return {
    puuid: `p-${name}`, gameName: name, tagLine: tag, teamId: team === 'team1' ? 'Blue' : 'Red', characterId: 'agent-riot',
    kills: kda[0], deaths: kda[1], assists: kda[2], acs: 250, firstBloods: 2, isTeam1: team === 'team1', isTeam2: team === 'team2',
  };
}

const result = (players: OcrPlayerRow[]): ScoreboardOcrResult => ({
  game: 'valorant', parserVersion: 'v3', engineVersion: 'test', outcome: field('victory'),
  allyScore: field(15, 0.4), enemyScore: field(13, 0.4), map: field({ name: 'Sunset' }), allyTeam: field('team1'),
  columns: ['kills', 'deaths', 'assists', 'trades'], players, warnings: [],
} as unknown as ScoreboardOcrResult);

const match: RiotMatchSummary = {
  matchId: 'riot-1', map: 'Sunset', startedAt: '2026-09-30T18:00:00Z', team1Rounds: 15, team2Rounds: 13,
  players: [riotPlayer('DarkHyper', '007', 'team1', [19, 18, 7]), riotPlayer('ghastii', 'EUW', 'team2', [23, 26, 6]), riotPlayer('شاي حبق', 'AR1', 'team2', [20, 19, 6])],
};

describe("Riot's record in the captain's review", () => {
  it('shows a renamed row as changed until the server re-checks it', () => {
    const found = { index: 0, name: 'DarkHyper', team: 'team1' as const, userId: 'u', status: 'verified' as const, source: null, readName: 'DarkHyper', riotStatus: 'confirmed' as const };
    expect(reviewCheck({ name: 'DarkHyper' }, found)).toEqual({ status: 'verified', riotStatus: 'confirmed' });
    expect(reviewCheck({ name: 'Someone' }, found)).toEqual({ status: 'edited', riotStatus: null });
  });

  it('compares the read with Riot cell by cell', () => {
    const comparison = compareWithRiot(result([row('DarkHyper', 'ally', [19, 18, 7]), row('ghastii', 'enemy', [23, 28, 6])]), match);
    expect(comparison.sameCells).toBe(5);
    expect(comparison.comparedCells).toBe(6);
    expect(comparison.rows[1].cells.find((c) => c.key === 'deaths')).toMatchObject({ read: 28, riot: 26, same: false });
    expect(comparison.unmatched).toEqual(['شاي حبق#AR1']);
  });

  it('accepts a parse response with or without the Riot block', () => {
    const base = { parseId: '6f1b8c1e-3a2b-4c5d-8e9f-0a1b2c3d4e5f', screenshotUrl: 'https://x/s.png', mapId: null,
      team1Id: '6f1b8c1e-3a2b-4c5d-8e9f-0a1b2c3d4e51', team2Id: '6f1b8c1e-3a2b-4c5d-8e9f-0a1b2c3d4e52' };
    const schemaResult = { game: 'valorant', parserVersion: 'v3', engineVersion: 'x', outcome: field('victory'), allyScore: field(13), enemyScore: field(5),
      map: field({ name: 'Ascent' }), allyTeam: field('team1'), columns: [], players: [], warnings: [] };
    expect(scoreboardOcrParseSchema.parse({ ...base, result: schemaResult }).riot).toBeUndefined();
    expect(scoreboardOcrParseSchema.parse({ ...base, result: schemaResult, riot: { status: 'found', match } }).riot?.match?.players).toHaveLength(3);
    expect(scoreboardOcrParseSchema.parse({ ...base, result: schemaResult, riot: { status: 'weird' } }).riot).toBeNull();
  });
});
