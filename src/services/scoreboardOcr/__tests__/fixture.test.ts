import { describe, expect, it } from 'vitest';
import { toFixtureJson } from '@/services/scoreboardOcr/fixture';
import type { ScoreboardOcrResult } from '@/types/scoreboardOcr';

const f = <T,>(value: T | null, confidence = 0.9) => ({ value, confidence });

describe('toFixtureJson', () => {
  it('produces the OCR accuracy-test fixture shape', () => {
    const result: ScoreboardOcrResult = {
      game: 'valorant', parserVersion: 'v1', engineVersion: 'e',
      outcome: f('victory'), allyScore: f(13), enemyScore: f(5), map: f({ name: 'Ascent' }), allyTeam: f(null),
      columns: ['kills', 'deaths', 'assists', 'firstBloods', 'plants', 'defuses'],
      players: [{
        side: 'ally', sideConfidence: 1, name: f('tr1ck'), rosterMatch: null, agent: f(null),
        stats: { kills: f(20), deaths: f(7), assists: f(3), firstBloods: f(1), plants: f(null), defuses: f(1) },
      }],
      warnings: [],
    };

    expect(toFixtureJson(result)).toEqual({
      outcome: 'victory', ally: 13, enemy: 5, map: 'Ascent',
      rows: [{ side: 'ally', name: 'tr1ck', kills: 20, deaths: 7, assists: 3, firstBloods: 1, plants: null, defuses: 1 }],
    });
  });
});
