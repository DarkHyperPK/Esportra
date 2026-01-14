import { BestOf, GameVetoConfig, TeamSide, VetoAction, VetoStep } from './types';
import { VALORANT_CONFIG } from './sequences';

export class VetoService {
    private config: GameVetoConfig;

    constructor(game: string = 'valorant') {
        // For now, default to Valorant. Can be extended to other games.
        if (game.toLowerCase() === 'valorant') {
            this.config = VALORANT_CONFIG;
        } else {
            // Fallback to Valorant if game not found, or throw error
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
