import { Trophy, Swords, Medal, LayoutGrid, Layers } from 'lucide-react';
import { GhostButton, SettingsButton } from '@/components/ui/app-buttons';
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

const nativeFilterBase =
    'inline-flex w-full items-center font-mono text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25';

const nativeFilterInactive =
    'text-zinc-400 hover:text-zinc-200 hover:bg-white/5';

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
                                <button
                                    key={stage.id}
                                    type="button"
                                    onClick={() => onStageSelect(stage.id)}
                                    className={cn(
                                        "w-full justify-between font-heading text-sm h-auto py-3 px-3.5 mb-2 transition-all duration-300 rounded-lg group",
                                        nativeFilterBase,
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
                                        <span className="truncate font-medium normal-case">{stage.name}</span>
                                    </div>

                                    {!hasBracket && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-rose-500/70 uppercase tracking-wider font-bold ml-2 border border-rose-500/10">
                                            Empty
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="p-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Filters</h3>

                {activeFilter.type === 'all' ? (
                    <SettingsButton
                        className="w-full justify-start gap-3 mb-2 normal-case"
                        onClick={() => onFilterChange({ type: 'all' })}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        All Matches
                    </SettingsButton>
                ) : (
                    <GhostButton
                        className="w-full justify-start gap-3 mb-2 normal-case"
                        onClick={() => onFilterChange({ type: 'all' })}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        All Matches
                    </GhostButton>
                )}
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
                            {winnersRounds.map((round) => {
                                const isActive = activeFilter.type === 'winners' && activeFilter.round === round;
                                return (
                                    <button
                                        key={`w-${round}`}
                                        type="button"
                                        className={cn(
                                            nativeFilterBase,
                                            "justify-start pl-8 h-8 normal-case",
                                            isActive
                                                ? "bg-yellow-500/10 text-yellow-500 border-r-2 border-yellow-500 rounded-r-none"
                                                : nativeFilterInactive
                                        )}
                                        onClick={() => onFilterChange({ type: 'winners', round })}
                                    >
                                        Round {round}
                                    </button>
                                );
                            })}
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
                            {losersRounds.map((round) => {
                                const isActive = activeFilter.type === 'losers' && activeFilter.round === round;
                                return (
                                    <button
                                        key={`l-${round}`}
                                        type="button"
                                        className={cn(
                                            nativeFilterBase,
                                            "justify-start pl-8 h-8 normal-case",
                                            isActive
                                                ? "bg-red-500/10 text-red-500 border-r-2 border-red-500 rounded-r-none"
                                                : nativeFilterInactive
                                        )}
                                        onClick={() => onFilterChange({ type: 'losers', round })}
                                    >
                                        Round {round}
                                    </button>
                                );
                            })}
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
                        <button
                            type="button"
                            className={cn(
                                nativeFilterBase,
                                "justify-start pl-8 h-8 normal-case",
                                activeFilter.type === 'final'
                                    ? "bg-purple-500/10 text-purple-500 border-r-2 border-purple-500 rounded-r-none"
                                    : nativeFilterInactive
                            )}
                            onClick={() => onFilterChange({ type: 'final' })}
                        >
                            Grand Finals
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
