import { GameVetoConfig, VetoStep } from './types';

// ── CS2 Veto Sequences (per match-parameters.txt) ────────────────────
// Bo1: Ban-Ban-Ban-Ban-Ban-Ban → remaining map played
const cs2BO1: VetoStep[] = [
    { actionNumber: 1, action: 'ban', team: 'T1' },
    { actionNumber: 2, action: 'ban', team: 'T2' },
    { actionNumber: 3, action: 'ban', team: 'T1' },
    { actionNumber: 4, action: 'ban', team: 'T2' },
    { actionNumber: 5, action: 'ban', team: 'T1' },
    { actionNumber: 6, action: 'ban', team: 'T2' },
    { actionNumber: 7, action: 'pick_side', team: 'T1', isDecider: true },
];

// Bo3: Ban-Ban-Pick-Pick-Ban-Ban → remaining map (decider)
const cs2BO3: VetoStep[] = [
    { actionNumber: 1, action: 'ban', team: 'T1' },
    { actionNumber: 2, action: 'ban', team: 'T2' },
    { actionNumber: 3, action: 'pick', team: 'T1' },
    { actionNumber: 4, action: 'pick_side', team: 'T2' },
    { actionNumber: 5, action: 'pick', team: 'T2' },
    { actionNumber: 6, action: 'pick_side', team: 'T1' },
    { actionNumber: 7, action: 'ban', team: 'T1' },
    { actionNumber: 8, action: 'ban', team: 'T2' },
    { actionNumber: 9, action: 'pick_side', team: 'T1', isDecider: true },
];

// Bo5: Ban-Ban-Pick-Pick-Pick-Pick → remaining map (decider)
const cs2BO5: VetoStep[] = [
    { actionNumber: 1, action: 'ban', team: 'T1' },
    { actionNumber: 2, action: 'ban', team: 'T2' },
    { actionNumber: 3, action: 'pick', team: 'T1' },
    { actionNumber: 4, action: 'pick_side', team: 'T2' },
    { actionNumber: 5, action: 'pick', team: 'T2' },
    { actionNumber: 6, action: 'pick_side', team: 'T1' },
    { actionNumber: 7, action: 'pick', team: 'T1' },
    { actionNumber: 8, action: 'pick_side', team: 'T2' },
    { actionNumber: 9, action: 'pick', team: 'T2' },
    { actionNumber: 10, action: 'pick_side', team: 'T1' },
    { actionNumber: 11, action: 'pick_side', team: 'T1', isDecider: true },
];

// ── Valorant Veto Sequences (per match-parameters.txt) ───────────────
// Bo1: Ban-Ban-Ban-Ban-Ban-Ban → remaining map played
const valorantBO1: VetoStep[] = [
    { actionNumber: 1, action: 'ban', team: 'T1' },
    { actionNumber: 2, action: 'ban', team: 'T2' },
    { actionNumber: 3, action: 'ban', team: 'T1' },
    { actionNumber: 4, action: 'ban', team: 'T2' },
    { actionNumber: 5, action: 'ban', team: 'T1' },
    { actionNumber: 6, action: 'pick', team: 'T1' },
    { actionNumber: 7, action: 'pick_side', team: 'T2' },
];

// Bo3: Pick-Pick-Ban-Ban-Ban-Ban → remaining map (decider)
const valorantBO3: VetoStep[] = [
    { actionNumber: 1, action: 'ban', team: 'T1' },
    { actionNumber: 2, action: 'ban', team: 'T2' },
    { actionNumber: 3, action: 'pick', team: 'T1' },
    { actionNumber: 4, action: 'pick_side', team: 'T2' },
    { actionNumber: 5, action: 'pick', team: 'T2' },
    { actionNumber: 6, action: 'pick_side', team: 'T1' },
    { actionNumber: 7, action: 'ban', team: 'T2' },
    { actionNumber: 8, action: 'ban', team: 'T1' },
    { actionNumber: 9, action: 'pick_side', team: 'T1', isDecider: true },
];

// Bo5: Pick-Pick-Ban-Ban-Pick-Pick → remaining map (decider)
const valorantBO5: VetoStep[] = [
    { actionNumber: 1, action: 'ban', team: 'T1' },
    { actionNumber: 2, action: 'ban', team: 'T2' },
    { actionNumber: 3, action: 'pick', team: 'T1' },
    { actionNumber: 4, action: 'pick_side', team: 'T2' },
    { actionNumber: 5, action: 'pick', team: 'T2' },
    { actionNumber: 6, action: 'pick_side', team: 'T1' },
    { actionNumber: 7, action: 'pick', team: 'T1' },
    { actionNumber: 8, action: 'pick_side', team: 'T2' },
    { actionNumber: 9, action: 'pick', team: 'T2' },
    { actionNumber: 10, action: 'pick_side', team: 'T1' },
    { actionNumber: 11, action: 'pick_side', team: 'T1', isDecider: true },
];

// ── R6S Veto Sequences (per match-parameters.txt) ────────────────────
// Bo1: Ban-Ban-Ban-Ban-Ban-Ban → remaining map
const r6sBO1: VetoStep[] = [
    { actionNumber: 1, action: 'ban', team: 'T1' },
    { actionNumber: 2, action: 'ban', team: 'T2' },
    { actionNumber: 3, action: 'ban', team: 'T1' },
    { actionNumber: 4, action: 'ban', team: 'T2' },
    { actionNumber: 5, action: 'ban', team: 'T1' },
    { actionNumber: 6, action: 'ban', team: 'T2' },
    { actionNumber: 7, action: 'pick_side', team: 'T1', isDecider: true },
];

// Bo3: Ban-Ban-Pick-Pick-Ban-Ban → decider
const r6sBO3: VetoStep[] = [
    { actionNumber: 1, action: 'ban', team: 'T1' },
    { actionNumber: 2, action: 'ban', team: 'T2' },
    { actionNumber: 3, action: 'pick', team: 'T1' },
    { actionNumber: 4, action: 'pick', team: 'T2' },
    { actionNumber: 5, action: 'ban', team: 'T1' },
    { actionNumber: 6, action: 'ban', team: 'T2' },
    { actionNumber: 7, action: 'pick_side', team: 'T1', isDecider: true },
];

// ── CoD Veto Sequences ───────────────────────────────────────────────
// CoD uses same structure as CS2 for map veto
const codBO3 = cs2BO3;
const codBO5 = cs2BO5;

// ── Configs ──────────────────────────────────────────────────────────

export const CS2_CONFIG: GameVetoConfig = {
    game: 'cs2',
    mapPoolSize: 7,
    sequences: {
        1: cs2BO1,
        3: cs2BO3,
        5: cs2BO5,
    },
};

export const VALORANT_CONFIG: GameVetoConfig = {
    game: 'valorant',
    mapPoolSize: 7,
    sequences: {
        1: valorantBO1,
        3: valorantBO3,
        5: valorantBO5,
    },
};

export const R6S_CONFIG: GameVetoConfig = {
    game: 'r6s',
    mapPoolSize: 9,
    sequences: {
        1: r6sBO1,
        3: r6sBO3,
        5: r6sBO3, // R6S doesn't have Bo5 in competitive — fallback to Bo3
    },
};

export const COD_CONFIG: GameVetoConfig = {
    game: 'cod',
    mapPoolSize: 10,
    sequences: {
        1: cs2BO1, // CoD rarely plays Bo1, fallback
        3: codBO3,
        5: codBO5,
    },
};
