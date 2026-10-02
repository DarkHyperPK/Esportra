import { describe, expect, it } from 'vitest';
import { buildPublicGames, isMeaningfulGame, isSeriesSummaryRow, resolveTeam1Side } from '../publicGameStats';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';

describe('isMeaningfulGame', () => {
    it('drops placeholder rows with no map, score or stats', () => {
        expect(isMeaningfulGame({ id: 'g1', map_name: 'Unknown map' })).toBe(false);
        expect(isMeaningfulGame({ id: 'g1' })).toBe(false);
    });

    it('keeps rows with a real map name or numbered score', () => {
        expect(isMeaningfulGame({ map_name: 'Haven' })).toBe(true);
        expect(isMeaningfulGame({ team1_score: 13, team2_score: 9, game_number: 1 })).toBe(true);
    });
});

describe('resolveTeam1Side', () => {
    it('prefers the explicit side', () => {
        expect(resolveTeam1Side({ t1Side: 'Red', reporterSide: 'Blue', reportedByTeamId: 't1' }, 't1')).toBe('Red');
    });

    it('derives team 1 side from the reporter', () => {
        expect(resolveTeam1Side({ reporterSide: 'Blue', reportedByTeamId: 'T1' }, 't1')).toBe('Blue');
        expect(resolveTeam1Side({ reporterSide: 'Blue', reportedByTeamId: 't2' }, 't1')).toBe('Red');
    });

    it('returns undefined when nothing identifies the side', () => {
        expect(resolveTeam1Side({}, 't1')).toBeUndefined();
        expect(resolveTeam1Side(null, 't1')).toBeUndefined();
    });
});

describe('buildPublicGames', () => {
    it('orders games by number and resolves the map winner', () => {
        const games = buildPublicGames([
            { id: 'b', map_name: 'Bind', game_number: 2, team1_score: 7, team2_score: 13 },
            { id: 'a', map_name: 'Haven', game_number: 1, team1_score: 13, team2_score: 11 },
        ]);

        expect(games.map((game) => game.mapName)).toEqual(['Haven', 'Bind']);
        expect(games.map((game) => game.winner)).toEqual(['team1', 'team2']);
    });

    it('flags maps with no recorded name and numbers them instead', () => {
        const games = buildPublicGames([
            { id: 'a', map_name: 'Haven', game_number: 1, team1_score: 13, team2_score: 11 },
            { id: 'b', map_name: 'Unknown map', game_number: 2, team1_score: 9, team2_score: 13 },
            { id: 'c', game_number: 3, team1_score: 13, team2_score: 5 },
        ]);

        expect(games.map((game) => [game.mapName, game.mapKnown])).toEqual([['Haven', true], ['Map 2', false], ['Map 3', false]]);
    });

    it('maps round winners onto series sides using team 1 side', () => {
        const [game] = buildPublicGames([{
            map_name: 'Ascent',
            team1_score: 2,
            team2_score: 1,
            match_details: {
                t1Side: 'Red',
                roundTimeline: [
                    { round: 1, winningTeam: 'Red' },
                    { round: 2, winningTeam: 'Blue' },
                    { round: 3, winningTeam: 'Red' },
                ],
            },
        }]);

        expect(game.rounds.map((round) => round.winner)).toEqual(['team1', 'team2', 'team1']);
    });

    it('leaves round winners unknown without a side', () => {
        const [game] = buildPublicGames([{
            map_name: 'Ascent',
            match_details: { roundTimeline: [{ round: 1, winningTeam: 'Red' }] },
        }]);

        expect(game.rounds[0].winner).toBeNull();
    });

    it('falls back to enriched snapshot players when no stored scoreboard exists', () => {
        const snapshot: EnrichedRiotMatchData = {
            matchInfo: { matchId: 'm' },
            teams: [],
            players: [{
                puuid: 'p1',
                gameName: 'Viper',
                teamId: 'Blue',
                stats: { kills: 20, deaths: 10, assists: 4, score: 5200, roundsPlayed: 20 },
            }],
        };
        const [game] = buildPublicGames([{ map_name: 'Lotus', match_details: { enrichedSnapshot: snapshot } }]);

        expect(game.players).toEqual([expect.objectContaining({ puuid: 'p1', kills: 20, roundsPlayed: 20 })]);
    });

    it('treats a drawn or unscored map as having no winner', () => {
        const games = buildPublicGames([
            { map_name: 'Split', team1_score: 12, team2_score: 12 },
            { map_name: 'Pearl' },
        ]);

        expect(games.map((game) => game.winner)).toEqual([null, null]);
    });
});

describe('isSeriesSummaryRow', () => {
    const series = { team1: 2, team2: 0 };

    it('treats the saved series score as a summary, not a map', () => {
        expect(isSeriesSummaryRow({ game_number: 1, map_name: 'Manual Result', team1_score: 2, team2_score: 0 }, series)).toBe(true);
        expect(isSeriesSummaryRow({ game_number: 1, team1_score: 2, team2_score: 0 }, series)).toBe(true);
        expect(isSeriesSummaryRow({ game_number: 1, map_name: 'Manual Result', team1_score: 1, team2_score: 0 })).toBe(true);
    });

    it('keeps real maps', () => {
        expect(isSeriesSummaryRow({ game_number: 1, map_name: 'Haven', team1_score: 2, team2_score: 0 }, series)).toBe(false);
        expect(isSeriesSummaryRow({ game_number: 1, team1_score: 13, team2_score: 9 }, series)).toBe(false);
        expect(isSeriesSummaryRow({ game_number: 1, team1_score: 2, team2_score: 0, riot_match_id: 'abc' }, series)).toBe(false);
        expect(isSeriesSummaryRow({ game_number: 1, team1_score: 2, team2_score: 0 })).toBe(false);
    });

    it('drops the summary row from the series', () => {
        const games = buildPublicGames([{ id: 'x', game_number: 1, team1_score: 2, team2_score: 0 }], null, series);
        expect(games).toEqual([]);
    });
});
