import { describe, expect, it } from 'vitest';
import { isRiotCandidate, riotReportBody } from '../riotReport';
import type { RiotMatchCandidate } from '@/types/riotMatchCandidate';

const candidate: RiotMatchCandidate = {
  id: 'riot-1', map: 'Sunset', mapId: '/Game/Maps/Juliett/Juliett', queueId: 'custom', startTime: 1, gameLengthMillis: 2,
  myTeamScore: 13, enemyTeamScore: 15, reporterSide: 'Red', score: '13-15', result: 'Defeat', kda: '19/18/7', agent: 'sova',
  blueTeam: { roundsWon: 15, won: true }, redTeam: { roundsWon: 13, won: false },
  players: [{ gameName: 'DarkHyper', tagLine: '007', isTeam1: false, isTeam2: true }],
};

describe('reporting a Riot game', () => {
  it('maps the reporter side and score to bracket teams (reporter is team2)', () => {
    const body = riotReportBody(candidate, { gameNumber: 2, userTeamId: 't2', team1Id: 't1', team2Id: 't2', mapName: 'Map', screenshotUrls: ['https://x/s.png'] });
    expect(body).toMatchObject({
      gameNumber: 2, riotMatchId: 'riot-1', mapName: 'Sunset', team1Score: 15, team2Score: 13, winnerTeamId: 't1', reportedByTeamId: 't2',
      screenshotUrls: ['https://x/s.png'],
    });
    expect(body.matchData).toMatchObject({ reporterSide: 'Red', t1Side: 'Blue', reporterResult: 'Defeat', players: candidate.players });
  });

  it('maps a winning team1 reporter, and works out the side when Riot did not say', () => {
    const won = { ...candidate, myTeamScore: 15, enemyTeamScore: 13, result: 'Victory' as const, reporterSide: undefined };
    const body = riotReportBody(won, { gameNumber: 1, userTeamId: 't1', team1Id: 't1', team2Id: 't2' });
    expect([body.team1Score, body.team2Score, body.winnerTeamId]).toEqual([15, 13, 't1']);
    expect(body.matchData).toMatchObject({ reporterSide: 'Blue', t1Side: 'Blue' });
  });

  it('only accepts a complete candidate from the API', () => {
    expect(isRiotCandidate(candidate)).toBe(true);
    expect(isRiotCandidate({ ...candidate, players: [] })).toBe(false);
    expect(isRiotCandidate({ ...candidate, result: 'Draw' })).toBe(false);
    expect(isRiotCandidate(null)).toBe(false);
  });
});
