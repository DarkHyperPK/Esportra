import { BestOf, GameVetoConfig, TeamSide, VetoAction, VetoStep } from './types';
import { VALORANT_CONFIG, CS2_CONFIG, R6S_CONFIG, COD_CONFIG, generateSequence } from './sequences';

export class VetoService {
    private config: GameVetoConfig;
    private poolSizeOverride: number | null;

    /**
     * @param game - Game identifier (e.g. 'valorant', 'cs2', 'rainbow six siege')
     * @param mapPoolSize - Optional override. When provided, sequences are generated
     *                      for this pool size instead of the game's default.
     *                      Pass `availableMaps.length` to make veto fully dynamic.
     */
    constructor(game: string = 'valorant', mapPoolSize?: number) {
        const gameKey = game.toLowerCase();
        if (gameKey === 'valorant') {
            this.config = VALORANT_CONFIG;
        } else if (gameKey === 'cs2' || gameKey === 'counter-strike 2') {
            this.config = CS2_CONFIG;
        } else if (gameKey === 'r6s' || gameKey === 'rainbow six siege') {
            this.config = R6S_CONFIG;
        } else if (gameKey === 'cod' || gameKey === 'call of duty') {
            this.config = COD_CONFIG;
        } else {
            this.config = VALORANT_CONFIG;
        }
        this.poolSizeOverride = mapPoolSize ?? null;
    }

    /** Effective pool size — override if provided, else game default */
    get mapPoolSize(): number {
        return this.poolSizeOverride ?? this.config.mapPoolSize;
    }

    getSequence(bestOf: BestOf): VetoStep[] {
        // If pool size is overridden, always generate fresh (overrides don't apply)
        if (this.poolSizeOverride !== null) {
            return generateSequence(this.poolSizeOverride, bestOf, this.config.bo1Style);
        }
        return this.config.overrides?.[bestOf]
            ?? generateSequence(this.config.mapPoolSize, bestOf, this.config.bo1Style);
    }

    getStep(bestOf: BestOf, actionNumber: number): VetoStep | undefined {
        const sequence = this.getSequence(bestOf);
        return sequence.find(step => step.actionNumber === actionNumber);
    }

    getTeamForAction(bestOf: BestOf, actionNumber: number): TeamSide | undefined {
        return this.getStep(bestOf, actionNumber)?.team;
    }

    getActionType(bestOf: BestOf, actionNumber: number): VetoAction | undefined {
        return this.getStep(bestOf, actionNumber)?.action;
    }

    isDeciderAction(bestOf: BestOf, actionNumber: number): boolean {
        return !!this.getStep(bestOf, actionNumber)?.isDecider;
    }

    getTotalActions(bestOf: BestOf): number {
        return this.getSequence(bestOf).length;
    }

    getSidePickerForMap(bestOf: BestOf, pickActionNumber: number): TeamSide | undefined {
        const step = this.getStep(bestOf, pickActionNumber);
        if (!step || step.action !== 'pick') return undefined;

        // The side picker is usually the opposite of the map picker
        return step.team === 'T1' ? 'T2' : 'T1';
    }

    isValidActionNumber(bestOf: BestOf, actionNumber: number): boolean {
        return actionNumber > 0 && actionNumber <= this.getTotalActions(bestOf);
    }
}

// Export a singleton instance for easy use
export const vetoService = new VetoService();
