import { GameVetoConfig, VetoStep } from './types';

const valorantBO1: VetoStep[] = [
    { actionNumber: 1, action: 'ban', team: 'T1' },
    { actionNumber: 2, action: 'ban', team: 'T2' },
    { actionNumber: 3, action: 'ban', team: 'T1' },
    { actionNumber: 4, action: 'ban', team: 'T2' },
    { actionNumber: 5, action: 'ban', team: 'T1' },
    { actionNumber: 6, action: 'pick', team: 'T1' },
    { actionNumber: 7, action: 'pick_side', team: 'T2', isDecider: true },
];

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

export const VALORANT_CONFIG: GameVetoConfig = {
    game: 'valorant',
    mapPoolSize: 7,
    sequences: {
        1: valorantBO1,
        3: valorantBO3,
        5: valorantBO5,
    },
};
