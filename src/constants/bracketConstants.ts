export const ROUND_WIDTH = 300;
export const MATCH_HEIGHT = 100;
export const GAP = 40;
export const S = MATCH_HEIGHT + GAP;

export const calculateX = (roundIndex: number) => roundIndex * ROUND_WIDTH;

export const calculateY = (roundIndex: number, matchIndex: number) => {
    const offset = (Math.pow(2, roundIndex) - 1) * (S / 2);
    return Math.pow(2, roundIndex) * S * matchIndex + offset;
};
