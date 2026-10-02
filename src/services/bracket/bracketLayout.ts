import type { BracketMatch, BracketTeam } from '@/types/bracketTypes';

/**
 * Pure layout for an elimination bracket drawn as a tree: where every match card
 * sits, what each column is called, where the sections and the champion seat go.
 * No React, no DOM - the renderer only paints what this returns.
 */

export type BracketDims = {
    cardWidth: number;
    cardHeight: number;
    roundGap: number;
    matchGap: number;
    /** Round name + caption + progress line above each column. */
    headerHeight: number;
    /** "Upper bracket" / "Lower bracket" title band (double elimination only). */
    sectionHeight: number;
    /** Space between the upper and lower bracket. */
    sectionGap: number;
    championWidth: number;
    championHeight: number;
};

export const DEFAULT_BRACKET_DIMS: BracketDims = {
    cardWidth: 248,
    cardHeight: 84,
    roundGap: 72,
    matchGap: 24,
    headerHeight: 56,
    sectionHeight: 52,
    sectionGap: 72,
    championWidth: 248,
    championHeight: 132,
};

type Side = 'winners' | 'losers' | 'final';

export type BracketColumn = {
    key: string;
    side: Side;
    round: number;
    x: number;
    /** Top of the column header. */
    y: number;
    label: string;
    total: number;
    played: number;
    live: number;
    bestOf?: number;
};

export type BracketSection = { side: 'winners' | 'losers'; y: number };

export type BracketLayout = {
    positions: Record<string, { x: number; y: number }>;
    columns: BracketColumn[];
    sections: BracketSection[];
    champion: { x: number; y: number; sourceId: string } | null;
    width: number;
    height: number;
};

export const rawMatchId = (id: string) => id.replace(/^(db-|wb-|lb-|source-)/, '');

export const isLiveStatus = (status?: string | null) => status === 'in_progress' || status === 'live';

const sideOf = (match: BracketMatch): Side =>
    match.bracketSide === 'losers' ? 'losers' : match.bracketSide === 'final' || match.bracketSide === 'reset' ? 'final' : 'winners';

function groupRounds(matches: BracketMatch[], side: Side) {
    const rounds = new Map<number, BracketMatch[]>();
    matches.filter((match) => sideOf(match) === side).forEach((match) => {
        rounds.set(match.round, [...(rounds.get(match.round) ?? []), match]);
    });
    return [...rounds.entries()]
        .sort(([a], [b]) => a - b)
        .map(([round, list]) => ({ round, list: [...list].sort((a, b) => a.matchNumber - b.matchNumber) }));
}

/**
 * Round names as the scene says them, counted back from the last round so a
 * bracket with byes or uneven rounds can't mislabel one: the last column is the
 * Final (only when it is one match), then Semifinals, Quarterfinals, Round of 16.
 */
export function roundLabel(side: Side, index: number, count: number, matchCount: number, doubleElimination: boolean): string {
    const fromEnd = count - 1 - index;
    if (side === 'final') return index === 0 ? 'Grand final' : 'Grand final reset';
    if (side === 'losers') return fromEnd === 0 ? 'Lower final' : `Lower round ${index + 1}`;
    if (doubleElimination) {
        if (fromEnd === 0) return 'Upper final';
        if (fromEnd === 1) return 'Upper semifinals';
        return `Upper round ${index + 1}`;
    }
    if (fromEnd === 0) return matchCount === 1 ? 'Final' : `Round ${index + 1}`;
    if (fromEnd === 1) return 'Semifinals';
    if (fromEnd === 2) return 'Quarterfinals';
    return `Round of ${2 ** (fromEnd + 1)}`;
}

function centerOf(ids: string[], positions: Map<string, { x: number; y: number }>): number | null {
    const ys = ids.map((id) => positions.get(id)?.y).filter((y): y is number => typeof y === 'number');
    return ys.length ? ys.reduce((sum, y) => sum + y, 0) / ys.length : null;
}

/** Keep cards in one column from overlapping, preserving their order. */
function spreadColumn(list: BracketMatch[], positions: Map<string, { x: number; y: number }>, step: number) {
    let floor = -Infinity;
    [...list]
        .sort((a, b) => (positions.get(a.id)?.y ?? 0) - (positions.get(b.id)?.y ?? 0))
        .forEach((match) => {
            const pos = positions.get(match.id);
            if (!pos) return;
            const y = Math.max(pos.y, floor);
            positions.set(match.id, { ...pos, y });
            floor = y + step;
        });
}

function columnStats(list: BracketMatch[]) {
    const bestOf = list.find((match) => typeof match.bestOf === 'number' && match.bestOf > 0)?.bestOf;
    return {
        total: list.length,
        played: list.filter((match) => match.status === 'completed').length,
        live: list.filter((match) => isLiveStatus(match.status)).length,
        bestOf,
    };
}

export function computeBracketLayout(matches: BracketMatch[], dims: BracketDims = DEFAULT_BRACKET_DIMS): BracketLayout {
    const positions = new Map<string, { x: number; y: number }>();
    const columns: BracketColumn[] = [];
    const sections: BracketSection[] = [];
    if (matches.length === 0) return { positions: {}, columns, sections, champion: null, width: 0, height: 0 };

    const { cardWidth, cardHeight, roundGap, matchGap, headerHeight, sectionHeight, sectionGap } = dims;
    const colX = (index: number) => index * (cardWidth + roundGap);
    const step = cardHeight + matchGap;
    const winners = groupRounds(matches, 'winners');
    const losers = groupRounds(matches, 'losers');
    const finals = groupRounds(matches, 'final');
    const doubleElimination = losers.length > 0;
    const sourcesOf = (id: string) => matches.filter((match) => match.nextMatchId && rawMatchId(match.nextMatchId) === rawMatchId(id)).map((match) => match.id);

    // Upper (or only) bracket: a perfect binary tree by slot.
    const upperTop = doubleElimination ? sectionHeight : 0;
    if (doubleElimination) sections.push({ side: 'winners', y: 0 });
    winners.forEach(({ round, list }, index) => {
        const power = 2 ** index;
        list.forEach((match, slotIndex) => {
            const slot = slotIndex * power + (power - 1) / 2;
            positions.set(match.id, { x: colX(index), y: upperTop + headerHeight + slot * step });
        });
        columns.push({
            key: `winners-${round}`, side: 'winners', round, x: colX(index), y: upperTop,
            label: roundLabel('winners', index, winners.length, list.length, doubleElimination), ...columnStats(list),
        });
    });
    const upperBottom = Math.max(0, ...[...positions.values()].map((pos) => pos.y + cardHeight));

    // Lower bracket: each match centres on the lower-bracket matches that feed it.
    if (doubleElimination) {
        const lowerTop = upperBottom + sectionGap;
        sections.push({ side: 'losers', y: lowerTop });
        const firstY = lowerTop + sectionHeight + headerHeight;
        losers.forEach(({ round, list }, index) => {
            list.forEach((match, stackIndex) => {
                const fed = sourcesOf(match.id).filter((id) => matches.find((m) => m.id === id && sideOf(m) === 'losers'));
                const y = centerOf(fed, positions) ?? firstY + stackIndex * step;
                positions.set(match.id, { x: colX(index), y });
            });
            spreadColumn(list, positions, step);
            columns.push({
                key: `losers-${round}`, side: 'losers', round, x: colX(index), y: lowerTop + sectionHeight,
                label: roundLabel('losers', index, losers.length, list.length, true), ...columnStats(list),
            });
        });
    }

    // Grand final(s): to the right of both brackets, between the matches that feed them.
    const finalStart = Math.max(winners.length, losers.length);
    finals.forEach(({ round, list }, index) => {
        list.forEach((match, i) => {
            const y = centerOf(sourcesOf(match.id), positions) ?? upperTop + headerHeight + i * step;
            positions.set(match.id, { x: colX(finalStart + index), y });
        });
        columns.push({
            key: `final-${round}`, side: 'final', round, x: colX(finalStart + index), y: upperTop,
            label: roundLabel('final', index, finals.length, list.length, doubleElimination), ...columnStats(list),
        });
    });

    // Champion seat: after the last match that feeds nothing.
    const terminal = [...matches]
        .filter((match) => !match.nextMatchId && positions.has(match.id))
        .sort((a, b) => (positions.get(b.id)?.x ?? 0) - (positions.get(a.id)?.x ?? 0))[0];
    const terminalPos = terminal ? positions.get(terminal.id) : undefined;
    const champion = terminal && terminalPos
        ? {
            x: terminalPos.x + cardWidth + roundGap,
            y: terminalPos.y + cardHeight / 2 - dims.championHeight / 2,
            sourceId: terminal.id,
        }
        : null;

    const all = [...positions.values()];
    const width = Math.max(...all.map((pos) => pos.x + cardWidth), champion ? champion.x + dims.championWidth : 0);
    const height = Math.max(...all.map((pos) => pos.y + cardHeight), champion ? champion.y + dims.championHeight : 0);

    return { positions: Object.fromEntries(positions), columns, sections, champion, width, height };
}

/** The bracket's winner once its last match is decided. */
export function bracketChampion(matches: BracketMatch[], terminalId: string | undefined): BracketTeam | null {
    if (!terminalId) return null;
    const terminal = matches.find((match) => match.id === terminalId);
    if (terminal?.status === 'completed' && terminal.winner) return terminal.winner;
    // A grand final the upper-bracket team won ends the event; an unplayed reset stays empty.
    const finals = matches.filter((match) => sideOf(match) === 'final').sort((a, b) => a.round - b.round);
    const reset = finals.length > 1 ? finals[finals.length - 1] : null;
    const grandFinal = finals.length > 1 ? finals[finals.length - 2] : null;
    if (reset && terminal?.id === reset.id && !reset.team1 && !reset.team2 && grandFinal?.status === 'completed') {
        return grandFinal.winner ?? null;
    }
    return null;
}

/**
 * A team's route through the bracket: the matches it played or is in, and the
 * matches it would still play by winning out (its road to the final).
 */
export function teamRoute(matches: BracketMatch[], teamId: string | null) {
    const played = new Set<string>();
    const ahead = new Set<string>();
    if (!teamId) return { played, ahead, alive: false };

    const byRaw = new Map(matches.map((match) => [rawMatchId(match.id), match]));
    const involved = matches.filter((match) => match.team1?.id === teamId || match.team2?.id === teamId);
    involved.forEach((match) => played.add(match.id));

    const open = involved.find((match) => match.status !== 'completed');
    const wins = involved.filter((match) => match.winner?.id === teamId);
    const lastWin = wins[wins.length - 1];
    const alive = Boolean(open) || (!!lastWin && !lastWin.nextMatchId);
    let cursor = open ?? null;
    const guard = new Set<string>();
    while (cursor?.nextMatchId && !guard.has(cursor.id)) {
        guard.add(cursor.id);
        const next = byRaw.get(rawMatchId(cursor.nextMatchId));
        if (!next) break;
        if (!played.has(next.id)) ahead.add(next.id);
        cursor = next;
    }
    return { played, ahead, alive };
}

/** Counts for the summary strip. */
export function summarizeBracket(matches: BracketMatch[]) {
    const teams = new Set<string>();
    matches.forEach((match) => {
        if (match.team1?.id) teams.add(match.team1.id);
        if (match.team2?.id) teams.add(match.team2.id);
    });
    return {
        total: matches.length,
        played: matches.filter((match) => match.status === 'completed').length,
        live: matches.filter((match) => isLiveStatus(match.status)).length,
        teams: teams.size,
    };
}

/** Every team in the bracket once, best seed first, for "Find a team". */
export function bracketTeams(matches: BracketMatch[]) {
    const byId = new Map<string, BracketTeam>();
    matches.forEach((match) => {
        [match.team1, match.team2].forEach((team) => {
            if (team?.id && team.name && !byId.has(team.id)) byId.set(team.id, team);
        });
    });
    return [...byId.values()].sort((a, b) => (a.seed || 999) - (b.seed || 999) || a.name.localeCompare(b.name));
}
