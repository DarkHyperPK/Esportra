import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BracketNode } from '@/types/bracket-graph';
import { Radio, Map as MapIcon, Trophy, Clock, Copy } from 'lucide-react';

interface Team {
    id: string;
    name: string;
    logo_url?: string | null;
}

interface GraphMatchCardProps {
    node: BracketNode;
    team1?: Team | null;
    team2?: Team | null;
    team1Score?: number | null;
    team2Score?: number | null;
    isOrganizer: boolean;
    onGoLive?: () => void;
    onOpenVeto?: () => void;
    onReportScore?: () => void;
    onCopyPartyCode?: (code: string) => void;
    partyCode?: string | null;
    scheduledTime?: string | null;
}

const GraphMatchCardInner: React.FC<GraphMatchCardProps> = ({
    node,
    team1,
    team2,
    team1Score,
    team2Score,
    isOrganizer,
    onGoLive,
    onOpenVeto,
    onReportScore,
    onCopyPartyCode,
    partyCode,
    scheduledTime
}) => {
    const isLive = node.status === 'in_progress';
    const isCompleted = node.status === 'completed';
    const isPending = node.status === 'pending' || node.status === 'scheduled';

    const isBye = (team1 && !team2) || (!team1 && team2);

    const team1IsWinner = isCompleted && node.winner_id === team1?.id;
    const team2IsWinner = isCompleted && node.winner_id === team2?.id;

    // Bracket type label
    const bracketLabel = node.bracket_type === 'winners' ? 'WB' :
        node.bracket_type === 'losers' ? 'LB' : 'GF';

    return (
        <Card className={cn(
            "w-full h-full flex flex-col p-2 transition-all",
            "bg-slate-900/80 border-slate-700",
            isLive && "border-red-500/50 shadow-lg shadow-red-500/10",
            isCompleted && "border-green-500/20"
        )}>
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase">
                        {bracketLabel} R{node.round_index + 1} M{node.match_number}
                    </span>
                    {isLive && (
                        <span className="flex items-center text-[10px] text-red-400 animate-pulse">
                            <Radio className="w-3 h-3 mr-1" />
                            LIVE
                        </span>
                    )}
                </div>

                {scheduledTime && isPending && (
                    <span className="flex items-center text-[10px] text-slate-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {scheduledTime}
                    </span>
                )}

                {isCompleted && (
                    <span className="flex items-center text-[10px] text-green-400">
                        <Trophy className="w-3 h-3 mr-1" />
                        Done
                    </span>
                )}
            </div>

            {/* Team 1 */}
            <TeamRow
                team={team1}
                score={team1Score}
                isWinner={team1IsWinner}
                isBye={!team1 && !!team2}
            />

            {/* Divider */}
            <div className="h-px bg-slate-700 my-1" />

            {/* Team 2 */}
            <TeamRow
                team={team2}
                score={team2Score}
                isWinner={team2IsWinner}
                isBye={!team2 && !!team1}
            />

            {/* Actions (Organizer Only) */}
            {isOrganizer && !isBye && !isCompleted && (
                <div className="flex gap-1 mt-2 flex-wrap">
                    {isPending && onGoLive && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={onGoLive}
                        >
                            <Radio className="w-3 h-3 mr-1" />
                            Go Live
                        </Button>
                    )}

                    {isLive && onOpenVeto && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            onClick={onOpenVeto}
                        >
                            <MapIcon className="w-3 h-3 mr-1" />
                            Veto
                        </Button>
                    )}

                    {isLive && onReportScore && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            onClick={onReportScore}
                        >
                            Score
                        </Button>
                    )}

                    {partyCode && onCopyPartyCode && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200"
                            onClick={() => onCopyPartyCode(partyCode)}
                        >
                            <Copy className="w-3 h-3 mr-1" />
                            {partyCode.slice(0, 6)}...
                        </Button>
                    )}
                </div>
            )}
        </Card>
    );
};

const TeamRow: React.FC<{
    team?: Team | null;
    score?: number | null;
    isWinner?: boolean;
    isBye?: boolean;
}> = ({ team, score, isWinner, isBye }) => {
    return (
        <div className={cn(
            "flex items-center justify-between px-2 py-1.5 rounded transition-colors",
            isWinner && "bg-green-500/10",
            isBye && "bg-slate-800/50 italic text-slate-500"
        )}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {team?.logo_url ? (
                    <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-5 h-5 rounded object-cover"
                    />
                ) : (
                    <div className="w-5 h-5 rounded bg-slate-700" />
                )}
                <span className={cn(
                    "text-sm truncate",
                    isWinner && "text-green-400 font-medium",
                    !team && "text-slate-500"
                )}>
                    {isBye ? 'BYE' : (team?.name || 'TBD')}
                </span>
            </div>

            <span className={cn(
                "font-mono text-sm ml-2",
                isWinner && "text-green-400 font-medium",
                score === null && "text-slate-600"
            )}>
                {score ?? '-'}
            </span>
        </div>
    );
};

export const GraphMatchCard = React.memo(GraphMatchCardInner);
export default GraphMatchCard;
