import React from 'react';
import { Play, Clock, CheckCircle, XCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchMapVeto } from '@/hooks/useMapVetoMachine';

interface VetoTurnIndicatorProps {
    veto: MatchMapVeto;
    isUserTurn: boolean;
    currentTeamName: string;
}

export const VetoTurnIndicator: React.FC<VetoTurnIndicatorProps> = ({
    veto,
    isUserTurn,
    currentTeamName,
}) => {
    if (!((veto.status === 'in_progress' || (veto.status === 'pending' && veto.best_of !== null && veto.best_of !== undefined)))) {
        return null;
    }

    return (
        <div className={cn(
            "mb-4 sm:mb-6 p-3 sm:p-4 lg:p-6 rounded-xl border-2",
            isUserTurn
                ? "bg-black border-green-500 shadow-lg shadow-green-500/20"
                : "bg-black border-white/20"
        )}>
            <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 w-full">
                    <div className={cn(
                        "p-2 sm:p-3 lg:p-4 rounded-xl border-2 flex-shrink-0",
                        isUserTurn ? "bg-green-500 border-green-400" : "bg-white/10 border-white/20"
                    )}>
                        {isUserTurn ? (
                            <Play className="h-4 w-4 sm:h-5 sm:w-5 lg:h-7 lg:w-7 text-white" fill="white" />
                        ) : (
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 lg:h-7 lg:w-7 text-white/60" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-white/60 uppercase tracking-wider mb-0.5 sm:mb-1">Current Turn</div>
                        <div className={cn('text-base sm:text-lg lg:text-xl xl:text-2xl font-black truncate', isUserTurn ? 'text-green-500' : 'text-white')}>
                            {isUserTurn ? 'YOUR TURN' : `${currentTeamName.toUpperCase()}'S TURN`}
                        </div>
                    </div>
                    <CheckCircle className={cn(
                        "h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 flex-shrink-0",
                        isUserTurn ? "text-green-500" : "text-white/40"
                    )} />
                </div>
                {/* Action Button - Full width on mobile */}
                <div className="w-full">
                    <div className={cn(
                        "w-full px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 sm:gap-2 border-2",
                        veto.current_action === 'ban'
                            ? "bg-red-500 text-white border-red-400"
                            : veto.current_action === 'pick_side'
                                ? "bg-white text-black border-white"
                                : "bg-green-500 text-white border-green-400"
                    )}>
                        {veto.current_action === 'ban' ? (
                            <>
                                <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                <span>BAN</span>
                            </>
                        ) : veto.current_action === 'pick_side' ? (
                            <>
                                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                <span>SIDE</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                <span>PICK</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
