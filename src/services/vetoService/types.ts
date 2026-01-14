export type VetoAction = 'ban' | 'pick' | 'pick_side';
export type TeamSide = 'T1' | 'T2';
export type BestOf = 1 | 3 | 5;

export interface VetoStep {
    actionNumber: number;
    action: VetoAction;
    team: TeamSide;
    isDecider?: boolean;
}

export interface GameVetoConfig {
    game: string;
    mapPoolSize: number;
    sequences: Record<BestOf, VetoStep[]>;
}
