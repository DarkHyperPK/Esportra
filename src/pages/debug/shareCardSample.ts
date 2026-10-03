import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';

/** A made-up but realistic Valorant map, so share cards can be checked without a real match. */
const AGENTS = {
    jett: 'add6443a-41bd-e414-f6ad-e58d267f4e95',
    sova: '320b2a48-4d9b-a075-30f1-1f93a9b638fa',
    omen: '8e253930-4c05-31dd-1b6c-968525494517',
    killjoy: '1e58de9c-4950-5125-93e9-a0aee9f98746',
    sage: '569fdd95-4d10-43ab-ca70-79becc718b46',
    raze: 'f94c3b30-42be-e959-889c-5aa313dba261',
    breach: '5f8d3a7f-467b-97f3-062c-13acf203c006',
    cypher: '117ed9e3-49f3-6512-3ccf-0cada7e3823b',
    viper: '707eab51-4836-f488-046a-cda6bf494859',
    reyna: 'a3bfb853-43b2-7238-a4f1-ad90e9e46bcc',
};

const ROWS: Array<[string, string, keyof typeof AGENTS, number, number, number, number, number, number, number]> = [
    // name, side, agent, K, D, A, score, ADR, HS%, first kills
    ['Zeyn', 'Blue', 'jett', 24, 14, 4, 6420, 178, 31, 6],
    ['Kami', 'Blue', 'sova', 18, 15, 9, 4980, 141, 24, 2],
    ['Faraz', 'Blue', 'omen', 15, 14, 11, 4310, 128, 22, 1],
    ['Hiro', 'Blue', 'killjoy', 14, 16, 5, 3920, 117, 27, 2],
    ['Omar', 'Blue', 'sage', 10, 15, 13, 3150, 92, 18, 0],
    ['Ali', 'Red', 'raze', 21, 17, 3, 5710, 162, 26, 4],
    ['Rafay', 'Red', 'reyna', 17, 18, 2, 4870, 139, 29, 3],
    ['Noor', 'Red', 'breach', 12, 18, 10, 3640, 104, 17, 1],
    ['Saad', 'Red', 'cypher', 11, 19, 6, 3290, 96, 21, 1],
    ['Umer', 'Red', 'viper', 13, 18, 7, 3560, 101, 20, 0],
];

export const SAMPLE_SHARE_MATCH: EnrichedRiotMatchData = {
    matchInfo: { matchId: 'sample-match', mapId: '/Game/Maps/Ascent/Ascent', region: 'ap', isCompleted: true },
    teams: [{ teamId: 'Blue', won: true, roundsWon: 13, roundsPlayed: 22 }, { teamId: 'Red', won: false, roundsWon: 9, roundsPlayed: 22 }],
    players: ROWS.map(([name, side, agent, kills, deaths, assists, score], index) => ({
        puuid: `sample-${index}`, gameName: name, tagLine: 'PK', teamId: side, characterId: AGENTS[agent], competitiveTier: 21,
        stats: { kills, deaths, assists, score, roundsPlayed: 22 },
    })),
    enrichedPlayers: ROWS.map(([, side, , kills, deaths, , score, adr, hsPct, firstBloods], index) => ({
        puuid: `sample-${index}`, teamId: side, acs: Math.round(score / 22), adr, hsPct, firstBloods, kdRatio: Math.round((kills / deaths) * 100) / 100,
    })),
};
