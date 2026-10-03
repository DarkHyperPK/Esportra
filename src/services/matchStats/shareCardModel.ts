import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';

/** One player's line on a share card. */
export interface SharePlayer {
    puuid: string;
    name: string;
    tag: string;
    agentId: string;
    kills: number;
    deaths: number;
    assists: number;
    acs: number;
    adr: number | null;
    hsPct: number | null;
    kd: number;
    firstKills: number | null;
}

export interface ShareTeam {
    name: string;
    logo?: string;
    side: string;
    score: number;
    won: boolean;
    players: SharePlayer[];
}

export interface ShareCardModel {
    mapName: string;
    /** Team 1 first, as in the bracket. */
    teams: [ShareTeam, ShareTeam];
    mvpPuuid: string | null;
    roundCount: number;
}

export interface ShareCardInput {
    team1Name: string;
    team2Name: string;
    team1Logo?: string;
    team2Logo?: string;
    /** Which Riot side team 1 played on. */
    t1Side: string;
    mapName: string;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

function toPlayer(match: EnrichedRiotMatchData, player: EnrichedRiotMatchData['players'][number], rounds: number): SharePlayer {
    const enriched = match.enrichedPlayers?.find((entry) => entry.puuid === player.puuid);
    const { kills, deaths, assists, score } = player.stats;
    return {
        puuid: player.puuid,
        name: player.gameName || 'Player',
        tag: player.tagLine ?? '',
        agentId: (player.characterId ?? '').toLowerCase(),
        kills,
        deaths,
        assists,
        acs: Math.round(enriched?.acs ?? score / Math.max(1, rounds)),
        adr: typeof enriched?.adr === 'number' ? Math.round(enriched.adr) : null,
        hsPct: typeof enriched?.hsPct === 'number' ? Math.round(enriched.hsPct) : null,
        kd: round1(enriched?.kdRatio ?? kills / Math.max(1, deaths)),
        firstKills: typeof enriched?.firstBloods === 'number' ? enriched.firstBloods : null,
    };
}

/** Shape one map's Riot record into what the match and player share cards draw. */
export function buildShareCardModel(match: EnrichedRiotMatchData, input: ShareCardInput): ShareCardModel {
    const t2Side = input.t1Side === 'Blue' ? 'Red' : 'Blue';
    const sideTeam = (side: string) => match.teams.find((team) => team.teamId === side);
    const roundCount = match.roundTimeline?.length
        || match.teams.reduce((sum, team) => sum + (team.roundsWon ?? 0), 0)
        || 1;

    const team = (side: string, name: string, logo?: string): ShareTeam => ({
        name,
        logo,
        side,
        score: sideTeam(side)?.roundsWon ?? 0,
        won: Boolean(sideTeam(side)?.won),
        players: match.players
            .filter((player) => player.teamId === side)
            .map((player) => toPlayer(match, player, roundCount))
            .sort((a, b) => b.acs - a.acs || b.kills - a.kills),
    });

    const teams: [ShareTeam, ShareTeam] = [
        team(input.t1Side, input.team1Name, input.team1Logo),
        team(t2Side, input.team2Name, input.team2Logo),
    ];
    const everyone = [...teams[0].players, ...teams[1].players].sort((a, b) => b.acs - a.acs || b.kills - a.kills);

    return { mapName: input.mapName, teams, mvpPuuid: everyone[0]?.puuid ?? null, roundCount };
}

/** The team a player played for, and whether they were the match MVP. */
export function findSharePlayer(model: ShareCardModel, puuid: string) {
    for (const team of model.teams) {
        const player = team.players.find((entry) => entry.puuid === puuid);
        if (player) return { player, team, isMvp: model.mvpPuuid === puuid };
    }
    return null;
}

/** "night-owls-vs-crimson-five-ascent" style file names. */
export function shareFileName(...parts: string[]): string {
    const slug = parts
        .join('-')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return `esportra-${slug || 'match'}.png`;
}
