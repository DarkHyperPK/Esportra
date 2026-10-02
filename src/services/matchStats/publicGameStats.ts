import type { MatchDetailsPayload } from '@/types/matchDetails';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import type { RiotTeamSide, ScoreboardPlayer } from '@/types/scoreboardPlayer';

/** One reported game (map) of a series, as returned by the match-games endpoints. */
export interface RawMatchGame {
    id?: string | number;
    map_id?: string | null;
    mapId?: string | null;
    map_name?: string | null;
    mapName?: string | null;
    game_number?: number | null;
    gameNumber?: number | null;
    team1_score?: number | null;
    team2_score?: number | null;
    match_details?: MatchDetailsPayload | null;
    /** Set when the result was fetched from Riot rather than typed in. */
    riot_match_id?: string | null;
    verification_status?: string | null;
    reported_by_team_id?: string | null;
    completed_at?: string | null;
}

/** How a map's result reached us. */
export type GameVerification = 'verified' | 'proposed' | 'pending' | 'disputed' | 'rejected';

export type SeriesSide = 'team1' | 'team2';

export interface PublicRound {
    round: number;
    winner: SeriesSide | null;
}

export interface PublicGame {
    key: string;
    gameNumber: number;
    mapName: string;
    team1Score: number | null;
    team2Score: number | null;
    winner: SeriesSide | null;
    players: ScoreboardPlayer[];
    t1Side?: RiotTeamSide;
    rounds: PublicRound[];
    riotMatchId: string | null;
    verification: GameVerification | null;
    reportedByTeamId: string | null;
    completedAt: string | null;
}

function readMapName(game: RawMatchGame) {
    return (game.map_name || game.mapName || '').trim();
}

function hasScore(game: RawMatchGame) {
    return typeof game.team1_score === 'number' && typeof game.team2_score === 'number';
}

/** Mirrors the bracket dialog's old filter: drop placeholder rows with nothing to show. */
export function isMeaningfulGame(game: RawMatchGame): boolean {
    const mapName = readMapName(game);
    return (game.match_details?.players?.length ?? 0) > 0
        || Boolean(game.match_details?.enrichedSnapshot)
        || Boolean(game.map_id || game.mapId)
        || (Boolean(mapName) && mapName.toLowerCase() !== 'unknown map')
        || (hasScore(game) && Boolean(game.game_number || game.gameNumber));
}

function storedEnriched(details?: MatchDetailsPayload | null): EnrichedRiotMatchData | null {
    if (!details) return null;
    if (details.enrichedSnapshot) return details.enrichedSnapshot;
    const candidate = details as MatchDetailsPayload & Partial<EnrichedRiotMatchData>;
    if (Array.isArray(candidate.teams) && Array.isArray(candidate.players) && candidate.matchInfo) {
        return candidate as EnrichedRiotMatchData;
    }
    return null;
}

function playersFromEnriched(enriched: EnrichedRiotMatchData): ScoreboardPlayer[] {
    if (enriched.enrichedPlayers?.length) return enriched.enrichedPlayers;
    return enriched.players.map((player) => ({
        puuid: player.puuid,
        gameName: player.gameName,
        tagLine: player.tagLine,
        teamId: player.teamId,
        characterId: player.characterId,
        kills: player.stats.kills,
        deaths: player.stats.deaths,
        assists: player.stats.assists,
        score: player.stats.score,
        roundsPlayed: player.stats.roundsPlayed,
    }));
}

/** Which Riot side team 1 played on, from the explicit field or the reporter's side. */
export function resolveTeam1Side(details: MatchDetailsPayload | null | undefined, team1Id?: string | null): RiotTeamSide | undefined {
    if (!details) return undefined;
    if (details.t1Side) return details.t1Side;
    if (details.reporterSide && details.reportedByTeamId && team1Id) {
        const reporterIsTeam1 = String(details.reportedByTeamId).toLowerCase() === String(team1Id).toLowerCase();
        if (reporterIsTeam1) return details.reporterSide;
        return details.reporterSide === 'Blue' ? 'Red' : 'Blue';
    }
    return undefined;
}

function gameWinner(team1Score: number | null, team2Score: number | null): SeriesSide | null {
    if (team1Score === null || team2Score === null || team1Score === team2Score) return null;
    return team1Score > team2Score ? 'team1' : 'team2';
}

const VERIFICATIONS: GameVerification[] = ['verified', 'proposed', 'pending', 'disputed', 'rejected'];

function readVerification(value?: string | null): GameVerification | null {
    const normalized = value?.toLowerCase() as GameVerification | undefined;
    return normalized && VERIFICATIONS.includes(normalized) ? normalized : null;
}

function toPublicGame(game: RawMatchGame, index: number, team1Id?: string | null): PublicGame {
    const details = game.match_details ?? null;
    const enriched = storedEnriched(details);
    const t1Side = resolveTeam1Side(details, team1Id);
    const team1Score = typeof game.team1_score === 'number' ? game.team1_score : null;
    const team2Score = typeof game.team2_score === 'number' ? game.team2_score : null;
    const timeline = details?.roundTimeline?.length ? details.roundTimeline : enriched?.roundTimeline ?? [];

    return {
        key: String(game.id ?? `game-${index}`),
        gameNumber: game.game_number ?? game.gameNumber ?? index + 1,
        mapName: readMapName(game) || `Map ${index + 1}`,
        team1Score,
        team2Score,
        winner: gameWinner(team1Score, team2Score),
        players: details?.players?.length ? details.players : enriched ? playersFromEnriched(enriched) : [],
        t1Side,
        rounds: timeline.map((entry) => ({
            round: entry.round,
            winner: t1Side ? (entry.winningTeam === t1Side ? 'team1' : 'team2') : null,
        })),
        riotMatchId: game.riot_match_id?.trim() || null,
        verification: readVerification(game.verification_status),
        reportedByTeamId: game.reported_by_team_id ?? details?.reportedByTeamId ?? null,
        completedAt: game.completed_at ?? null,
    };
}

/** Shape reported games into an ordered, render-ready series for spectators. */
export function buildPublicGames(rawGames: RawMatchGame[], team1Id?: string | null): PublicGame[] {
    return rawGames
        .filter(isMeaningfulGame)
        .map((game, index) => toPublicGame(game, index, team1Id))
        .sort((left, right) => left.gameNumber - right.gameNumber);
}
