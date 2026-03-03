import React from 'react';
import { Play, Clock, XCircle, CheckCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchMapVeto } from '@/hooks/useMapVetoMachine';

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

    const actionLabel = veto.current_action === 'ban' ? 'BAN' : veto.current_action === 'pick_side' ? 'SIDE' : 'PICK';
    const actionColorClass = veto.current_action === 'ban'
        ? 'bg-red-500 text-white'
        : veto.current_action === 'pick_side'
            ? 'bg-white text-black'
            : 'bg-green-500 text-white';

    return (
        <div className={cn(
            "mb-3 px-3 py-2 rounded-lg border flex items-center gap-2 sm:gap-3",
            isUserTurn ? "bg-black border-green-500 shadow-md shadow-green-500/10" : "bg-black border-white/20"
        )}>
            {/* Status icon */}
            <div className={cn(
                "p-1.5 rounded-md border flex-shrink-0",
                isUserTurn ? "bg-green-500 border-green-400" : "bg-white/10 border-white/20"
            )}>
                {isUserTurn
                    ? <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" fill="white" />
                    : <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/60" />
                }
            </div>

            {/* Turn label */}
            <span className={cn(
                'text-xs sm:text-sm font-black truncate',
                isUserTurn ? 'text-green-500' : 'text-white'
            )}>
                {isUserTurn ? 'YOUR TURN' : `${currentTeamName.toUpperCase()}'S TURN`}
            </span>

            {/* Action badge */}
            <div className={cn(
                'px-2 py-0.5 rounded text-[10px] sm:text-xs font-black flex items-center gap-1 flex-shrink-0',
                actionColorClass
            )}>
                {veto.current_action === 'ban' ? (
                    <XCircle className="h-3 w-3" />
                ) : veto.current_action === 'pick_side' ? (
                    <Settings className="h-3 w-3" />
                ) : (
                    <CheckCircle className="h-3 w-3" />
                )}
                {actionLabel}
            </div>
        </div>
    );
};
