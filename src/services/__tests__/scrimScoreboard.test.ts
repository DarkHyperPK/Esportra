import { describe, expect, it } from 'vitest';
import { toScrimParseResult, toScrimRecentMatch } from '../scrimScoreboard';
import type { ScoreboardOcrParse } from '@/types/scoreboardOcr';

const raw = { id: 'm1', map: 'Haven', startTime: 1, myTeamScore: 13, enemyTeamScore: 9, gameLengthMillis: 1000, agent: 'Jett', kda: '1/2/3' };

describe('toScrimRecentMatch', () => {
  it('orients scores to team1 when my team is team1', () => {
    expect(toScrimRecentMatch(raw, 'team1')).toMatchObject({ team1Score: 13, team2Score: 9, result: 'win' });
  });

  it('flips scores when my team is team2', () => {
    expect(toScrimRecentMatch(raw, 'team2')).toMatchObject({ team1Score: 9, team2Score: 13, result: 'win' });
  });

  it('marks a loss from the viewer perspective', () => {
    expect(toScrimRecentMatch({ ...raw, myTeamScore: 5 }, 'team1').result).toBe('loss');
  });
});

describe('toScrimParseResult', () => {
  const field = <T,>(value: T | null, confidence = 0.95) => ({ value, confidence });
  const parse = (allyTeam: 'team1' | 'team2' | null) => ({
    parseId: 'p', screenshotUrl: 'u', mapId: null,
    result: {
      allyScore: field(13), enemyScore: field(7), allyTeam: field(allyTeam), map: field(null),
      outcome: field(null), columns: [], players: [], warnings: [],
    },
  }) as unknown as ScoreboardOcrParse;

  it('maps ally/enemy scores onto team1/team2', () => {
    expect(toScrimParseResult(parse('team2'), 'team1')).toMatchObject({ team1Score: 7, team2Score: 13 });
  });

  it('assumes the reporter is the ally side when unknown and asks for a check', () => {
    const out = toScrimParseResult(parse(null), 'team1');
    expect(out).toMatchObject({ team1Score: 13, team2Score: 7 });
    expect(out.message).toMatch(/check/i);
  });
});
