import { Trophy, Swords, Medal, LayoutGrid, ChevronRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type FilterState =
    | { type: 'all' }
    | { type: 'winners'; round: number }
    | { type: 'losers'; round: number }
    | { type: 'final' };

interface BracketSidebarFilterProps {
    winnersRounds: number[];
    losersRounds: number[];
    hasFinals: boolean;
    activeFilter: FilterState;
    onFilterChange: (filter: FilterState) => void;

    // New Props for Stage Filtering
    stages?: any[];
    selectedStageId?: string | null;
    onStageSelect?: (stageId: string) => void;
    versionsMap?: Record<string, string>;

    className?: string;
}

export const BracketSidebarFilter: React.FC<BracketSidebarFilterProps> = ({
    winnersRounds,
    losersRounds,
    hasFinals,
    activeFilter,
    onFilterChange,
    stages,
    selectedStageId,
    onStageSelect,
    versionsMap = {},
    className
}) => {
    return (
        <div className={cn("w-64 flex-shrink-0 bg-zinc-950/50 border-r border-white/5 flex flex-col h-full overflow-y-auto", className)}>

            {/* Stage Selection Section */}
            {stages && stages.length > 0 && onStageSelect && (
                <div className="p-4 border-b border-white/5">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5" />
                        Stages
                    </h3>
                    <div className="space-y-1">
                        {stages.map((stage) => {
                            const isActive = stage.id === selectedStageId;
                            const hasBracket = !!versionsMap[stage.id];
                            return (
                                <Button
                                    key={stage.id}
                                    variant={isActive ? "secondary" : "ghost"}
                                    onClick={() => onStageSelect(stage.id)}
                                    className={cn(
                                        "w-full justify-between font-heading text-sm h-auto py-3 px-3.5 mb-2 transition-all duration-300 rounded-lg group",
                                        isActive
                                            ? "bg-gradient-to-r from-rose-600/20 to-rose-900/10 text-white shadow-[0_0_20px_rgba(225,29,72,0.15)] border border-rose-500/20"
                                            : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5 truncate">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full transition-all duration-300 shadow-sm",
                                            isActive
                                                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] scale-110"
                                                : "bg-zinc-700 group-hover:bg-zinc-500"
                                        )} />
                                        <span className="truncate font-medium">{stage.name}</span>
                                    </div>

                                    {!hasBracket && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-rose-500/70 uppercase tracking-wider font-bold ml-2 border border-rose-500/10">
                                            Empty
                                        </span>
                                    )}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="p-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Filters</h3>

                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start gap-3 mb-2",
                        activeFilter.type === 'all'
                            ? "bg-white/10 text-white"
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                    onClick={() => onFilterChange({ type: 'all' })}
                >
                    <LayoutGrid className="w-4 h-4" />
                    All Matches
                </Button>
            </div>

            <div className="p-4 space-y-6">
                {/* Winners Bracket */}
                {winnersRounds.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-2">
                            <Trophy className="w-3 h-3" />
                            Winners Bracket
                        </div>
                        <div className="space-y-1">
                            {winnersRounds.map((round) => (
                                <Button
                                    key={`w-${round}`}
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "w-full justify-start pl-8 text-xs h-8",
                                        activeFilter.type === 'winners' && activeFilter.round === round
                                            ? "bg-yellow-500/10 text-yellow-500 border-r-2 border-yellow-500 rounded-r-none"
                                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                                    )}
                                    onClick={() => onFilterChange({ type: 'winners', round })}
                                >
                                    Round {round}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Losers Bracket */}
                {losersRounds.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-2">
                            <Swords className="w-3 h-3" />
                            Losers Bracket
                        </div>
                        <div className="space-y-1">
                            {losersRounds.map((round) => (
                                <Button
                                    key={`l-${round}`}
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "w-full justify-start pl-8 text-xs h-8",
                                        activeFilter.type === 'losers' && activeFilter.round === round
                                            ? "bg-red-500/10 text-red-500 border-r-2 border-red-500 rounded-r-none"
                                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                                    )}
                                    onClick={() => onFilterChange({ type: 'losers', round })}
                                >
                                    Round {round}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Finals */}
                {hasFinals && (
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-2">
                            <Medal className="w-3 h-3" />
                            Championship
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "w-full justify-start pl-8 text-xs h-8",
                                activeFilter.type === 'final'
                                    ? "bg-purple-500/10 text-purple-500 border-r-2 border-purple-500 rounded-r-none"
                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                            )}
                            onClick={() => onFilterChange({ type: 'final' })}
                        >
                            Grand Finals
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
