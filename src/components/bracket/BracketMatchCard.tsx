import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Trophy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export interface BracketTeam {
    id: string;
    name: string;
    logo?: string | null;
    score?: number | null;
    isWinner?: boolean;
    eliminated?: boolean;
}

export interface BracketMatchProps {
    match: {
        id: string;
        match_number: number;
        status: string;
        team1: BracketTeam | null;
        team2: BracketTeam | null;
        winner_id?: string | null;
        scheduledTime?: string;
        resultImages?: string[];
        partyCode?: string;
        bestOf?: number;
        roundName?: string;
    };
    isExpanded: boolean;
    onToggle: () => void;
    onAction?: () => void;
    actionLabel?: string;
    className?: string;
    highlight?: boolean;

    // Drag and Drop props
    onTeamDragStart?: (e: React.DragEvent, slot: 'team1' | 'team2') => void;
    onTeamDragOver?: (e: React.DragEvent) => void;
    onTeamDrop?: (e: React.DragEvent, slot: 'team1' | 'team2') => void;
    isDraggable?: boolean;

    // Visuals
    connectorType?: 'top' | 'bottom' | 'none';
    connectorHeight?: string;
    leftConnector?: boolean;
}

const BracketMatchCard: React.FC<BracketMatchProps & { actions?: React.ReactNode }> = ({
    match,
    isExpanded,
    onToggle,
    onAction,
    actionLabel,
    className,
    highlight,
    actions,
    onTeamDragStart,
    onTeamDragOver,
    onTeamDrop,
    isDraggable,
    connectorType = 'none',
    connectorHeight = '1rem',
    leftConnector = false
}) => {
    const { team1, team2, status } = match;
    const [isInView, setIsInView] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' } // Load slightly before it comes into view
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Helper to render a team row
    const renderTeam = (team: BracketTeam | null, slot: 'team1' | 'team2') => {
        const isWinner = team?.isWinner;
        const isEliminated = team?.eliminated;

        return (
            <div
                className={cn(
                    "flex items-center justify-between p-2 rounded transition-colors relative group/team",
                    isWinner && "bg-green-900/20 border border-green-900/30",
                    isEliminated && "opacity-60 bg-red-900/10",
                    !team && "bg-zinc-900/30",
                    isDraggable && "cursor-grab active:cursor-grabbing hover:bg-zinc-800/50"
                )}
                draggable={isDraggable && !!team}
                onDragStart={(e) => onTeamDragStart?.(e, slot)}
                onDragOver={onTeamDragOver}
                onDrop={(e) => onTeamDrop?.(e, slot)}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {team?.logo ? (
                        <img src={team.logo} alt={team.name} className="w-6 h-6 rounded object-cover bg-zinc-900" />
                    ) : (
                        <div className="w-6 h-6 rounded bg-zinc-900 flex items-center justify-center text-xs text-zinc-500 shrink-0 border border-zinc-800">
                            {team ? team.name.charAt(0) : '?'}
                        </div>
                    )}
                    <span className={cn(
                        "text-sm font-medium truncate",
                        isWinner ? "text-green-400" : "text-zinc-300",
                        !team && "text-zinc-600 italic",
                        isEliminated && "text-red-400/70 line-through decoration-red-500/30"
                    )}>
                        {team?.name || 'TBD'}
                    </span>
                </div>
                <div className={cn(
                    "font-bold text-sm px-2",
                    isWinner ? "text-green-400" : "text-zinc-500"
                )}>
                    {team?.score ?? '-'}
                </div>
            </div>
        );
    };

    return (
        <div className="relative flex items-center" ref={cardRef}>
            {/* Left Connector */}
            {leftConnector && (
                <div className="absolute -left-6 top-1/2 w-6 h-0.5 bg-zinc-800 pointer-events-none" />
            )}

            <div className={cn(
                "flex flex-col bg-[#09090b] border rounded-lg transition-all duration-200 relative z-10 w-full",
                highlight ? "border-green-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "border-zinc-800",
                isExpanded ? "shadow-xl border-zinc-700 bg-[#18181b]" : "hover:border-zinc-700 h-auto",
                !isExpanded && "h-32", // Fixed height (8rem) for alignment when collapsed
                className
            )}>
                {!isInView ? (
                    <div className="h-full w-full flex items-center justify-center text-zinc-800">
                        <div className="w-8 h-8 rounded-full bg-zinc-900/50 animate-pulse" />
                    </div>
                ) : (
                    <>
                        {/* Match Header / Compact View */}
                        <div
                            className="cursor-pointer p-1 h-full flex flex-col justify-between"
                            onClick={onToggle}
                        >
                            <div className="flex justify-between items-center px-2 py-1 text-xs text-zinc-500 border-b border-zinc-900 mb-1">
                                <span className="font-medium text-zinc-400">{match.roundName || `Match #${match.match_number}`}</span>
                                <div className="flex items-center gap-2">
                                    {match.scheduledTime && (
                                        <span className="text-[10px] text-zinc-600">{match.scheduledTime}</span>
                                    )}
                                    <Badge variant="outline" className={cn(
                                        "text-[10px] h-4 px-1 border-0",
                                        status === 'completed' ? "text-green-400 bg-green-400/10" :
                                            status === 'in_progress' ? "text-yellow-400 bg-yellow-400/10 animate-pulse" :
                                                "text-zinc-500 bg-zinc-500/10"
                                    )}>
                                        {status}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col justify-center gap-1 px-1 pb-1">
                                {renderTeam(team1, 'team1')}
                                {renderTeam(team2, 'team2')}
                            </div>

                            {/* Expand Indicator */}
                            <div className="flex justify-center pb-1">
                                <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ChevronDown className="w-3 h-3 text-gray-600" />
                                </motion.div>
                            </div>
                        </div>

                        {/* Expanded Actions */}
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-3 border-t border-[#27272a] bg-[#202024] rounded-b-lg">
                                        {actions ? (
                                            <div className="flex flex-col gap-2">
                                                {actions}
                                            </div>
                                        ) : onAction ? (
                                            <Button
                                                size="sm"
                                                className="w-full text-xs"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAction();
                                                }}
                                            >
                                                {actionLabel || 'View Details'}
                                            </Button>
                                        ) : (
                                            <div className="text-center text-xs text-gray-500 py-1">
                                                No actions available
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>

            {/* Connector Lines */}
            {connectorType !== 'none' && (
                <div
                    className={cn(
                        "absolute -right-6 w-6 border-r-2 border-zinc-800 pointer-events-none",
                        connectorType === 'top' ? "top-1/2 border-t-2 rounded-tr-lg" : "bottom-1/2 border-b-2 rounded-br-lg"
                    )}
                    style={{ height: `calc(50% + ${connectorHeight})` }}
                />
            )}
            {/* Horizontal stub for the connector */}
            {connectorType !== 'none' && (
                <div className="absolute -right-4 top-1/2 w-4 h-0.5 bg-zinc-800 pointer-events-none" />
            )}
        </div>
    );
};

export default BracketMatchCard;
