export type VetoAction = 'ban' | 'pick' | 'pick_side';
export type TeamSide = 'T1' | 'T2';
export type BestOf = 1 | 3 | 5;

/** BO1 veto style: 'pure_ban' bans all maps down to 1; 'ban_pick' bans to 2, then pick */
export type Bo1Style = 'pure_ban' | 'ban_pick';

export interface VetoStep {
    actionNumber: number;
    action: VetoAction;
    team: TeamSide;
    isDecider?: boolean;
}

export interface GameVetoConfig {
    game: string;
    mapPoolSize: number;
    bo1Style: Bo1Style;
    /** Per-bestOf overrides. When provided, used instead of the generated sequence. */
    overrides?: Partial<Record<BestOf, VetoStep[]>>;
}
