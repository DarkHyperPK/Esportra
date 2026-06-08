import EntityAvatar from '@/components/ui/EntityAvatar';
import { formatLocalTime } from '@/lib/timeUtils';
import { cn } from '@/lib/utils';

interface ReadOnlyMatchCardProps {
    match: any;
    x?: number;
    y?: number;
    className?: string;
    onClick?: () => void;
    hasAutomatedResults?: boolean;
    hasProofs?: boolean;
    hoveredTeamId?: string | null;
    onTeamHover?: (teamId: string | null) => void;
}

export const ReadOnlyMatchCard: React.FC<ReadOnlyMatchCardProps> = ({
    match,
    x,
    y,
    className,
    onClick,
    hasAutomatedResults,
    hasProofs,
    hoveredTeamId,
    onTeamHover
}) => {
    const team1Won = match.winner?.id && match.winner.id === match.team1?.id;
    const team2Won = match.winner?.id && match.winner.id === match.team2?.id;
    const isCompleted = match.status === 'completed';
    const isLive = match.status === 'live';
    const hasAnyResults = hasAutomatedResults || hasProofs;
    const team1Highlighted = hoveredTeamId && hoveredTeamId === match.team1?.id;
    const team2Highlighted = hoveredTeamId && hoveredTeamId === match.team2?.id;
    const containsHoveredTeam = Boolean(team1Highlighted || team2Highlighted);
    const dimForHoveredPath = Boolean(hoveredTeamId && !containsHoveredTeam);

    const style: React.CSSProperties = x !== undefined && y !== undefined ? {
        position: 'absolute',
        left: x,
        top: y,
        width: 260,
        height: 86
    } : {
        position: 'relative',
        minWidth: 260,
        height: 86
    };

    return (
        <div
            className={cn(
                'transition-all duration-300',
                className,
                hasAnyResults && 'cursor-pointer group',
                containsHoveredTeam && 'scale-[1.02] drop-shadow-[0_0_18px_rgba(244,63,94,0.28)]',
                dimForHoveredPath && 'opacity-35 grayscale',
            )}
            style={style}
            onClick={hasAnyResults ? onClick : undefined}
            onMouseLeave={() => onTeamHover?.(null)}
        >
            <div className={`
                relative w-full h-full rounded overflow-hidden
                bg-slate-800 border-l-4
                ${isLive ? 'border-red-500' : isCompleted ? 'border-zinc-600' : 'border-slate-700'}
                ${hasAnyResults ? 'hover:bg-slate-700/80 transition-colors' : ''}
                shadow-md
            `}>
                {/* Live indicator (moved to footer) */}

                {/* Hover Overlay: Show Match Details */}
                {hasAnyResults && (
                    <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            Show match details
                        </span>
                    </div>
                )}

                {/* Team 1 */}
                <div
                    className={cn(
                        'flex items-center justify-between h-[35px] px-3 border-b border-slate-700/50 transition-colors',
                        team1Won && 'bg-slate-700/50',
                        team1Highlighted && 'bg-rose-500/20 text-white ring-1 ring-inset ring-rose-500/40',
                    )}
                    onMouseEnter={() => match.team1?.id && onTeamHover?.(match.team1.id)}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <EntityAvatar
                            src={match.team1?.logo_url}
                            name={match.team1?.name || '?'}
                            entityId={match.team1?.id}
                            type="team"
                            size="w-6 h-6"
                            className="rounded-sm"
                        />
                        <span className={cn('text-xs font-medium truncate', team1Won || team1Highlighted ? 'text-white' : 'text-slate-400')}>
                            {match.team1?.name || (isCompleted ? 'BYE' : 'TBD')}
                        </span>
                    </div>
                    <div className="flex items-center">
                        <span className={`text-sm font-bold tabular-nums ${team1Won ? 'text-orange-500' : 'text-slate-500'}`}>
                            {match.team1_score ?? '-'}
                        </span>
                        {team1Won && <div className="w-1 h-full absolute right-0 top-0 bg-orange-500" />}
                    </div>
                </div>

                {/* Team 2 */}
                <div
                    className={cn(
                        'flex items-center justify-between h-[35px] px-3 transition-colors',
                        team2Won && 'bg-slate-700/50',
                        team2Highlighted && 'bg-rose-500/20 text-white ring-1 ring-inset ring-rose-500/40',
                    )}
                    onMouseEnter={() => match.team2?.id && onTeamHover?.(match.team2.id)}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <EntityAvatar
                            src={match.team2?.logo_url}
                            name={match.team2?.name || '?'}
                            entityId={match.team2?.id}
                            type="team"
                            size="w-6 h-6"
                            className="rounded-sm"
                        />
                        <span className={cn('text-xs font-medium truncate', team2Won || team2Highlighted ? 'text-white' : 'text-slate-400')}>
                            {match.team2?.name || (isCompleted ? 'BYE' : 'TBD')}
                        </span>
                    </div>
                    <div className="flex items-center">
                        <span className={`text-sm font-bold tabular-nums ${team2Won ? 'text-orange-500' : 'text-slate-500'}`}>
                            {match.team2_score ?? '-'}
                        </span>
                        {team2Won && <div className="w-1 h-full absolute right-0 bottom-0 bg-orange-500" />}
                    </div>
                </div>

                {/* Footer - Match Timing */}
                <div className="flex items-center justify-between h-[16px] px-2 bg-slate-900/50">
                    <div className="text-[9px] font-medium text-slate-500 uppercase flex items-center gap-1">
                        {isLive ? (
                            <span className="text-red-500 font-bold flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span>
                                LIVE
                            </span>
                        ) : match.scheduledTime ? (
                            <span>
                                {formatLocalTime(match.scheduledTime, 'MMM d • h:mm a')}
                            </span>
                        ) : (
                            <span>TBD</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
