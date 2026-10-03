import { describe, expect, it } from 'vitest';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import { buildShareCardModel, findSharePlayer, shareFileName } from '../shareCardModel';

const player = (puuid: string, teamId: string, kills: number, score: number) => ({
    puuid, gameName: puuid.toUpperCase(), tagLine: 'PK', teamId, characterId: 'ABC',
    stats: { kills, deaths: 10, assists: 3, score, roundsPlayed: 22 },
});

const match: EnrichedRiotMatchData = {
    matchInfo: { matchId: 'm1' },
    teams: [{ teamId: 'Blue', won: false, roundsWon: 9 }, { teamId: 'Red', won: true, roundsWon: 13 }],
    players: [player('b1', 'Blue', 18, 4400), player('b2', 'Blue', 25, 6600), player('r1', 'Red', 20, 5500)],
    enrichedPlayers: [{ puuid: 'r1', acs: 310, adr: 180.4, hsPct: 31.6, kdRatio: 2, firstBloods: 4 }],
};

describe('buildShareCardModel', () => {
    const model = buildShareCardModel(match, { team1Name: 'Night Owls', team2Name: 'Crimson Five', t1Side: 'Red', mapName: 'Ascent' });

    it('puts team 1 first using its Riot side', () => {
        expect(model.teams.map((team) => [team.name, team.side, team.score, team.won])).toEqual([
            ['Night Owls', 'Red', 13, true],
            ['Crimson Five', 'Blue', 9, false],
        ]);
        expect(model.roundCount).toBe(22);
    });

    it('prefers enriched stats and sorts by ACS', () => {
        expect(model.teams[0].players[0]).toMatchObject({ puuid: 'r1', acs: 310, adr: 180, hsPct: 32, kd: 2, firstKills: 4 });
        expect(model.teams[1].players.map((p) => p.puuid)).toEqual(['b2', 'b1']);
        expect(model.teams[1].players[0]).toMatchObject({ acs: 300, adr: null, kd: 2.5 });
    });

    it('names the MVP and finds a player', () => {
        expect(model.mvpPuuid).toBe('r1');
        expect(findSharePlayer(model, 'b1')).toMatchObject({ team: { name: 'Crimson Five' }, isMvp: false });
        expect(findSharePlayer(model, 'nope')).toBeNull();
    });
});

describe('shareFileName', () => {
    it('slugs the parts', () => {
        expect(shareFileName('Night Owls', 'vs', 'Crimson Five!', 'Ascent')).toBe('esportra-night-owls-vs-crimson-five-ascent.png');
        expect(shareFileName('')).toBe('esportra-match.png');
    });
});
