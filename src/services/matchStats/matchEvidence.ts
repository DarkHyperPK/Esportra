import type { PublicGame } from './publicGameStats';

/** A screenshot a team attached to a result, for the whole match or one map. */
export interface MatchEvidence {
    url: string;
    /** Null when the screenshot came with the match result, not a specific map. */
    gameNumber: number | null;
    reportedByTeamId: string | null;
}

/** Where a map's result came from, as spectators should read it. */
export type ResultSource = 'riot' | 'screenshot' | 'reported';

/**
 * Riot first: a Riot match id or Riot player stats mean the result was fetched,
 * not typed. Otherwise a screenshot for that map. Otherwise just a reported score.
 */
export function resultSource(game: Pick<PublicGame, 'riotMatchId' | 'players'>, screenshots: MatchEvidence[]): ResultSource {
    if (game.riotMatchId || game.players.length > 0) return 'riot';
    if (screenshots.length > 0) return 'screenshot';
    return 'reported';
}

/** Screenshots for one map. */
export function evidenceForGame(evidence: MatchEvidence[], gameNumber: number): MatchEvidence[] {
    return evidence.filter((item) => item.gameNumber === gameNumber);
}

/** Screenshots that came with the whole match, or with a map that isn't in the series list. */
export function matchLevelEvidence(evidence: MatchEvidence[], gameNumbers: number[]): MatchEvidence[] {
    return evidence.filter((item) => item.gameNumber === null || !gameNumbers.includes(item.gameNumber));
}

/** One line on how the series was reported, for the strip under the scoreline. */
export function seriesSourceSummary(sources: ResultSource[]) {
    const riot = sources.filter((source) => source === 'riot').length;
    const shots = sources.filter((source) => source === 'screenshot').length;
    if (sources.length === 0) return null;
    if (riot === sources.length) return { lead: 'riot' as const, text: riot === 1 ? 'Result pulled from Riot' : `All ${riot} maps pulled from Riot` };
    if (shots === sources.length) return { lead: 'screenshot' as const, text: `Reported with screenshots` };
    const parts = [riot ? `${riot} from Riot` : null, shots ? `${shots} by screenshot` : null].filter(Boolean);
    return { lead: riot ? ('riot' as const) : shots ? ('screenshot' as const) : ('reported' as const), text: parts.length ? parts.join(' · ') : 'Scores reported by the teams' };
}

export type CaptionedShot = { url: string; caption: string; index: number };
export type ShotGroup = { key: string; title: string; shots: CaptionedShot[] };

/**
 * Orders every screenshot into one list (so a viewer can step through all of
 * them) and groups it by map, with match-wide shots last. Captions say which
 * map and which team.
 */
export function arrangeEvidence(
    games: Array<{ key: string; gameNumber: number; mapName: string }>,
    evidence: MatchEvidence[],
    teamName: (teamId: string | null) => string | null,
) {
    const shots: CaptionedShot[] = [];
    const byGame: Record<string, CaptionedShot[]> = {};
    const groups: ShotGroup[] = [];
    const caption = (title: string, item: MatchEvidence) => [title, teamName(item.reportedByTeamId)].filter(Boolean).join(' · ');
    const take = (title: string, items: MatchEvidence[]) => items.map((item) => {
        const shot = { url: item.url, caption: caption(title, item), index: shots.length };
        shots.push(shot);
        return shot;
    });

    games.forEach((game) => {
        const title = `Map ${game.gameNumber} · ${game.mapName}`;
        const list = take(title, evidenceForGame(evidence, game.gameNumber));
        if (list.length === 0) return;
        byGame[game.key] = list;
        groups.push({ key: game.key, title, shots: list });
    });

    const rest = matchLevelEvidence(evidence, games.map((game) => game.gameNumber));
    if (rest.length > 0) groups.push({ key: 'match', title: 'Match screenshots', shots: take('Match screenshot', rest) });

    return { shots, byGame, groups };
}
