type BracketMatchLabelInput = {
    round?: number | null;
    matchNumber?: number | null;
    bracketSide?: string | null;
};

type BracketMatchLabelOptions = {
    isDoubleElimination?: boolean;
    finalsMatchCount?: number;
    maxFinalRound?: number;
};

export function isDoubleEliminationBracket(
    matches: Array<{ bracketSide?: string | null }>,
): boolean {
    return matches.some((match) => match.bracketSide === 'losers');
}

export function formatBracketMatchLabel(
    match: BracketMatchLabelInput,
    options: BracketMatchLabelOptions = {},
): string | null {
    const round = match.round;
    const matchNumber = match.matchNumber;
    const hasRound = typeof round === 'number' && Number.isFinite(round) && round > 0;
    const hasMatchNumber = typeof matchNumber === 'number' && Number.isFinite(matchNumber) && matchNumber > 0;

    if (!hasMatchNumber) return null;

    if (match.bracketSide === 'final') {
        if (
            options.finalsMatchCount
            && options.finalsMatchCount > 1
            && options.maxFinalRound
            && round === options.maxFinalRound
        ) {
            return 'Grand Finals Reset';
        }
        return 'Grand Finals';
    }

    if (options.isDoubleElimination) {
        const prefix = match.bracketSide === 'losers' ? 'LB' : 'WB';
        if (hasRound) return `${prefix}.${round}.M${matchNumber}`;
        return `${prefix}.M${matchNumber}`;
    }

    if (hasRound) return `R${round}.M${matchNumber}`;
    return `M${matchNumber}`;
}
