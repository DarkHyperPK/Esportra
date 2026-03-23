import { BestOf, GameVetoConfig, TeamSide, VetoAction, VetoStep } from './types';
import { VALORANT_CONFIG, CS2_CONFIG, R6S_CONFIG, COD_CONFIG } from './sequences';

export class VetoService {
    private config: GameVetoConfig;

    constructor(game: string = 'valorant') {
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
    }

    getSequence(bestOf: BestOf): VetoStep[] {
        return this.config.sequences[bestOf] || [];
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
