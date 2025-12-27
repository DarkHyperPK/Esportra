import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import BracketMatchCard, { BracketMatchProps } from './BracketMatchCard';
import { cn } from '@/lib/utils';

interface BracketRoundProps {
    roundNumber: number;
    spacingRoundNumber?: number; // New prop for visual spacing
    totalRounds: number;
    matches: BracketMatchProps['match'][];
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    expandedMatchId: string | null;
    onToggleMatch: (matchId: string) => void;
    onMatchAction?: (matchId: string) => void;
    getMatchActionLabel?: (match: BracketMatchProps['match']) => string;
    renderMatchActions?: (match: BracketMatchProps['match']) => React.ReactNode;
    userTeamId?: string;
    onTeamDragStart?: (e: React.DragEvent, match: BracketMatchProps['match'], slot: 'team1' | 'team2') => void;
    onTeamDragOver?: (e: React.DragEvent) => void;
    onTeamDrop?: (e: React.DragEvent, match: BracketMatchProps['match'], slot: 'team1' | 'team2') => void;
    isOrganizer?: boolean;
    roundName?: string;
}

const BracketRound: React.FC<BracketRoundProps> = ({
    roundNumber,
    spacingRoundNumber,
    totalRounds,
    matches,
    isCollapsed,
    onToggleCollapse,
    expandedMatchId,
    onToggleMatch,
    onMatchAction,
    getMatchActionLabel,
    renderMatchActions,
    userTeamId,
    onTeamDragStart,
    onTeamDragOver,
    onTeamDrop,
    isOrganizer,
    roundName
}) => {
    // Use spacingRoundNumber if provided, otherwise default to roundNumber
    const effectiveRoundNumber = spacingRoundNumber ?? roundNumber;

    // Determine round name
    const getRoundName = () => {
        if (roundName) return roundName;
        if (roundNumber === totalRounds) return 'Grand Finals';
        if (roundNumber === totalRounds - 1) return 'Semi-Finals';
        if (roundNumber === totalRounds - 2) return 'Quarter-Finals';
        return `Round ${roundNumber}`;
    };

    // Determine spacing based on round number
    // H = Card Height = 8rem (128px)
    // g = Base Gap = 1.5rem (24px)
    // P_r = (H + g) * 2^(r-1)
    // Gap_r = P_r - H
    // Offset_r = (H + g) * (2^(r-1) - 1) / 2
    const getRoundSpacing = () => {
        const H = 8; // rem
        const g = 1.5; // rem
        const power = Math.pow(2, effectiveRoundNumber - 1);

        const pitch = (H + g) * power;
        const gapVal = pitch - H;
        const offsetVal = (H + g) * (power - 1) / 2;
        const connectorHeightVal = gapVal / 2;

        return {
            gap: `${gapVal}rem`,
            paddingTop: `${offsetVal}rem`,
            connectorHeight: `${connectorHeightVal}rem`
        };
    };

    const { gap, paddingTop, connectorHeight } = getRoundSpacing();

    return (
        <Collapsible
            open={!isCollapsed}
            onOpenChange={onToggleCollapse}
            className="w-full min-w-[300px] max-w-[350px] flex flex-col gap-2"
        >
            <div className="flex items-center justify-between bg-[#18181b] p-2 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 h-6 w-6 hover:bg-zinc-800 text-zinc-400">
                            {isCollapsed ? (
                                <ChevronRight className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </Button>
                    </CollapsibleTrigger>
                    <span className="font-bold text-sm text-zinc-100 uppercase tracking-wider">{getRoundName()}</span>
                    <span className="text-xs text-zinc-500 font-mono">({matches.length})</span>
                </div>
            </div>

            <CollapsibleContent
                className="flex flex-col animate-in slide-in-from-top-2"
                style={{ gap: gap, paddingTop: paddingTop }}
            >
                {matches.map((match, index) => {
                    const isUserMatch = userTeamId && (match.team1?.id === userTeamId || match.team2?.id === userTeamId);

                    // Determine connector type
                    let connectorType: 'top' | 'bottom' | 'none' = 'none';
                    if (roundNumber < totalRounds) {
                        connectorType = index % 2 === 0 ? 'top' : 'bottom';
                    }

                    // Determine if draggable
                    const canDrag = isOrganizer && match.status === 'pending';

                    return (
                        <BracketMatchCard
                            key={match.id}
                            match={match}
                            isExpanded={expandedMatchId === match.id}
                            onToggle={() => onToggleMatch(match.id)}
                            onAction={onMatchAction ? () => onMatchAction(match.id) : undefined}
                            actionLabel={getMatchActionLabel ? getMatchActionLabel(match) : undefined}
                            actions={renderMatchActions ? renderMatchActions(match) : undefined}
                            highlight={!!isUserMatch}
                            className={cn(isUserMatch && "border-primary/40 bg-primary/5")}
                            connectorType={connectorType}
                            connectorHeight={connectorHeight}
                            leftConnector={effectiveRoundNumber > 1}
                            isDraggable={canDrag}
                            onTeamDragStart={(e, slot) => onTeamDragStart?.(e, match, slot)}
                            onTeamDragOver={onTeamDragOver}
                            onTeamDrop={(e, slot) => onTeamDrop?.(e, match, slot)}
                        />
                    );
                })}
            </CollapsibleContent>
        </Collapsible>
    );
};

export default BracketRound;
