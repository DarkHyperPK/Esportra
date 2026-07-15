import React from 'react';
import { cn } from '@/lib/utils';
import { MatchMapVeto } from '@/hooks/useMapVetoMachine';
import { getVetoActionClasses, getVetoActionNoun } from './vetoActionPresentation';

interface VetoTurnIndicatorProps {
    veto: MatchMapVeto;
    isUserTurn: boolean;
    currentTeamName: string;
    bestOf: number;
}

export const VetoTurnIndicator: React.FC<VetoTurnIndicatorProps> = ({
    veto,
    isUserTurn,
    currentTeamName,
    bestOf,
}) => {
    if (!((veto.status === 'in_progress' || (veto.status === 'pending' && bestOf !== null && bestOf !== undefined)))) {
        return null;
    }

    const actionNum = veto.current_action_number || 1;
    const action = veto.current_action || 'ban';

    return (
        <div className={cn(
            "mb-3 px-3 py-2 rounded-lg border flex items-center gap-2 sm:gap-3",
            isUserTurn ? "bg-black border-rose-500 shadow-md shadow-rose-500/10" : "bg-black border-white/20"
        )}>
            <div className={cn(
                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border text-xs font-black tabular-nums",
                isUserTurn ? "bg-rose-500 border-rose-400" : "bg-white/10 border-white/20"
            )}>
                {actionNum}.
            </div>

            <span className={cn(
                'text-xs sm:text-sm font-black truncate',
                isUserTurn ? 'text-rose-300' : 'text-white'
            )}>
                {isUserTurn ? 'YOUR TURN' : `${currentTeamName.toUpperCase()}'S TURN`}
            </span>

            <div className={cn(
                'px-2 py-0.5 rounded text-[10px] sm:text-xs font-black flex-shrink-0',
                getVetoActionClasses(action)
            )}>
                {getVetoActionNoun(action)}
            </div>
        </div>
    );
};
