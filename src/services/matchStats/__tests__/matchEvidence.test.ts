import { describe, expect, it } from 'vitest';
import { evidenceForGame, matchLevelEvidence, resultSource, seriesSourceSummary, type MatchEvidence } from '../matchEvidence';

const shot = (gameNumber: number | null): MatchEvidence => ({ url: `https://cdn/${gameNumber}.png`, gameNumber, reportedByTeamId: 'a' });

describe('resultSource', () => {
    it('reads a Riot match id or Riot stats as fetched from Riot', () => {
        expect(resultSource({ riotMatchId: 'abc', players: [] }, [])).toBe('riot');
        expect(resultSource({ riotMatchId: null, players: [{ puuid: 'p' }] }, [shot(1)])).toBe('riot');
    });

    it('falls back to the screenshot, then to a plain reported score', () => {
        expect(resultSource({ riotMatchId: null, players: [] }, [shot(1)])).toBe('screenshot');
        expect(resultSource({ riotMatchId: null, players: [] }, [])).toBe('reported');
    });
});

describe('evidence grouping', () => {
    const evidence = [shot(1), shot(2), shot(null), shot(5)];

    it('finds the screenshots for one map', () => {
        expect(evidenceForGame(evidence, 2).map((e) => e.gameNumber)).toEqual([2]);
    });

    it('keeps match-wide shots and shots for maps not in the series together', () => {
        expect(matchLevelEvidence(evidence, [1, 2]).map((e) => e.gameNumber)).toEqual([null, 5]);
    });
});

describe('seriesSourceSummary', () => {
    it('says when everything came from Riot', () => {
        expect(seriesSourceSummary(['riot', 'riot'])).toEqual({ lead: 'riot', text: 'All 2 maps pulled from Riot' });
    });

    it('counts a mixed series', () => {
        expect(seriesSourceSummary(['riot', 'screenshot', 'reported'])?.text).toBe('1 from Riot · 1 by screenshot');
    });

    it('is empty without maps', () => {
        expect(seriesSourceSummary([])).toBeNull();
    });
});

describe('arrangeEvidence', () => {
    it('groups by map, keeps match-wide shots last, and numbers every shot once', async () => {
        const { arrangeEvidence } = await import('../matchEvidence');
        const games = [{ key: 'g1', gameNumber: 1, mapName: 'Haven' }, { key: 'g2', gameNumber: 2, mapName: 'Bind' }];
        const evidence = [shot(null), shot(2), shot(1), { ...shot(1), url: 'https://cdn/1b.png', reportedByTeamId: 'b' }];
        const result = arrangeEvidence(games, evidence, (id) => (id === 'a' ? 'Night Owls' : id === 'b' ? 'Red Comet' : null));

        expect(result.groups.map((group) => group.title)).toEqual(['Map 1 · Haven', 'Map 2 · Bind', 'Match screenshots']);
        expect(result.shots.map((s) => s.index)).toEqual([0, 1, 2, 3]);
        expect(result.byGame.g1.map((s) => s.caption)).toEqual(['Map 1 · Haven · Night Owls', 'Map 1 · Haven · Red Comet']);
        expect(result.groups[2].shots[0].caption).toBe('Match screenshot · Night Owls');
    });

    it('does not repeat the number for a map with no recorded name', async () => {
        const { arrangeEvidence } = await import('../matchEvidence');
        const games = [{ key: 'g1', gameNumber: 1, mapName: 'Map 1', mapKnown: false }];
        const result = arrangeEvidence(games, [shot(1)], () => null);

        expect(result.groups[0].title).toBe('Map 1');
    });
});
