import { BestOf, Bo1Style, GameVetoConfig, TeamSide, VetoStep } from './types';

// ── Dynamic Veto Sequence Generator ────────────────────────────────────
// Derives sequences from pool size + bestOf at runtime. No hardcoded step arrays.

function generateBo1(poolSize: number, style: Bo1Style): VetoStep[] {
    const steps: VetoStep[] = [];
    let n = 1;

    if (style === 'pure_ban') {
        // Ban all but 1 → decider side pick (CS2 / R6S / CoD style)
        for (let i = 0; i < poolSize - 1; i++) {
            steps.push({ actionNumber: n++, action: 'ban', team: i % 2 === 0 ? 'T1' : 'T2' });
        }
        steps.push({ actionNumber: n++, action: 'pick_side', team: 'T1', isDecider: true });
    } else {
        // Ban down to 2 → pick → opponent side pick (Valorant style)
        for (let i = 0; i < poolSize - 2; i++) {
            steps.push({ actionNumber: n++, action: 'ban', team: i % 2 === 0 ? 'T1' : 'T2' });
        }
        steps.push({ actionNumber: n++, action: 'pick', team: 'T1' });
        steps.push({ actionNumber: n++, action: 'pick_side', team: 'T2' });
    }

    return steps;
}

function generateBoX(poolSize: number, bestOf: 3 | 5): VetoStep[] {
    const steps: VetoStep[] = [];
    let n = 1;
    const explicitPicks = bestOf - 1; // 2 for BO3, 4 for BO5
    const remainingBans = poolSize - bestOf - 2;

    if (remainingBans < 0) {
        throw new Error(
            `Map pool (${poolSize}) too small for BO${bestOf}. Need at least ${bestOf + 2} maps.`
        );
    }

    // Phase 1: 2 initial bans (T1 → T2)
    steps.push({ actionNumber: n++, action: 'ban', team: 'T1' });
    steps.push({ actionNumber: n++, action: 'ban', team: 'T2' });

    // Phase 2: alternating picks; opponent picks side after each pick
    for (let i = 0; i < explicitPicks; i++) {
        const picker: TeamSide = i % 2 === 0 ? 'T1' : 'T2';
        const sidePicker: TeamSide = picker === 'T1' ? 'T2' : 'T1';
        steps.push({ actionNumber: n++, action: 'pick', team: picker });
        steps.push({ actionNumber: n++, action: 'pick_side', team: sidePicker });
    }

    // Phase 3: remaining bans (alternating T1 → T2)
    for (let i = 0; i < remainingBans; i++) {
        steps.push({ actionNumber: n++, action: 'ban', team: i % 2 === 0 ? 'T1' : 'T2' });
    }

    // Phase 4: decider side pick
    const deciderTeam: TeamSide = bestOf === 5 ? 'T2' : 'T1';
    steps.push({ actionNumber: n++, action: 'pick_side', team: deciderTeam, isDecider: true });

    return steps;
}

/** Generate a veto sequence dynamically from pool size and best-of format. */
export function generateSequence(
    poolSize: number,
    bestOf: BestOf,
    bo1Style: Bo1Style = 'pure_ban',
): VetoStep[] {
    if (bestOf === 1) return generateBo1(poolSize, bo1Style);
    return generateBoX(poolSize, bestOf);
}

// ── Game Configs ────────────────────────────────────────────────────────
// Only pool size and BO1 style. Sequences are generated at runtime.

export const CS2_CONFIG: GameVetoConfig = {
    game: 'cs2',
    mapPoolSize: 7,
    bo1Style: 'pure_ban',
};

export const VALORANT_CONFIG: GameVetoConfig = {
    game: 'valorant',
    mapPoolSize: 7,
    bo1Style: 'pure_ban',
};

export const R6S_CONFIG: GameVetoConfig = {
    game: 'r6s',
    mapPoolSize: 9,
    bo1Style: 'pure_ban',
};

export const COD_CONFIG: GameVetoConfig = {
    game: 'cod',
    mapPoolSize: 10,
    bo1Style: 'pure_ban',
};
