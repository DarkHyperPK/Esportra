import EntityAvatar from '@/components/ui/EntityAvatar';
import { formatLocalTime } from '@/lib/timeUtils';
import { cn } from '@/lib/utils';
import { formatBracketMatchLabel } from '@/utils/bracketMatchLabel';

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
    isDoubleElimination?: boolean;
}

const SeedRail = ({ seed }: { seed?: number | null }) => {
    const seedLabel = typeof seed === 'number' && Number.isFinite(seed) && seed > 0 ? seed : '';

    return (
        <span className="flex h-full w-8 shrink-0 items-center justify-center border-r border-black/25 bg-zinc-600/70 text-[10px] font-bold tabular-nums text-zinc-950/80">
            {seedLabel}
        </span>
    );
};

export const ReadOnlyMatchCard: React.FC<ReadOnlyMatchCardProps> = ({
    match,
    x,
    y,
    className,
    onClick,
    hasAutomatedResults: _hasAutomatedResults,
    hasProofs: _hasProofs,
    hoveredTeamId,
    onTeamHover,
    isDoubleElimination = false,
}) => {
    const team1Won = match.winner?.id && match.winner.id === match.team1?.id;
    const team2Won = match.winner?.id && match.winner.id === match.team2?.id;
    const isCompleted = match.status === 'completed';
    const isLive = match.status === 'live';
    const team1Highlighted = hoveredTeamId && hoveredTeamId === match.team1?.id;
    const team2Highlighted = hoveredTeamId && hoveredTeamId === match.team2?.id;
    const teamInMatch = Boolean(
        hoveredTeamId && (match.team1?.id === hoveredTeamId || match.team2?.id === hoveredTeamId),
    );
    const matchCode = formatBracketMatchLabel(match, { isDoubleElimination });

    const clearTeamHoverUnlessEnteringTeamRow = (e: React.MouseEvent) => {
        if (!onTeamHover || !hoveredTeamId) return;
        const related = e.relatedTarget;
        if (related instanceof Element && related.closest('[data-bracket-team-row]')) {
            return;
        }
        onTeamHover(null);
    };

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
                'transition-colors duration-200',
                className,
                onClick && 'cursor-pointer',
            )}
            style={style}
            onClick={() => {
                onTeamHover?.(null);
                onClick?.();
            }}
            onMouseLeave={clearTeamHoverUnlessEnteringTeamRow}
        >
            <div className={cn(
                'relative w-full h-full rounded overflow-hidden border border-zinc-800/80 bg-zinc-900 shadow-md transition-all duration-200',
                isLive ? 'ring-1 ring-rose-500/40' : isCompleted ? 'ring-1 ring-zinc-700/40' : 'ring-1 ring-zinc-800/40',
                onClick && 'hover:bg-zinc-800/80 transition-colors',
                hoveredTeamId && !teamInMatch && 'opacity-30',
                teamInMatch && 'border-rose-500/50 ring-2 ring-rose-500/40 shadow-rose-500/10 shadow-lg',
            )}>

                {/* Team 1 */}
                <div
                    data-bracket-team-row
                    className={cn(
                        'flex h-[35px] items-center border-b border-slate-700/50 transition-colors',
                        team1Won && 'bg-slate-700/50',
                        team1Highlighted && 'bg-rose-500/20 text-white ring-1 ring-inset ring-rose-500/40',
                    )}
                    onMouseEnter={() => match.team1?.id && onTeamHover?.(match.team1.id)}
                    onMouseLeave={clearTeamHoverUnlessEnteringTeamRow}
                >
                    <SeedRail seed={match.team1?.seed} />
                    <div className="flex min-w-0 flex-1 items-center justify-between px-2.5">
                        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                            <EntityAvatar
                                src={match.team1?.logo_url}
                                name={match.team1?.name || '?'}
                                entityId={match.team1?.id}
                                type="team"
                                size="w-6 h-6"
                                className="rounded-sm"
                            />
                            <span className={cn('truncate text-xs font-medium', team1Won || team1Highlighted ? 'text-white' : 'text-slate-400')}>
                                {match.team1?.name || (isCompleted ? 'BYE' : 'TBD')}
                            </span>
                        </div>
                        <div className="flex shrink-0 items-center pl-2">
                            <span className={`text-sm font-bold tabular-nums ${team1Won ? 'text-orange-500' : 'text-slate-500'}`}>
                                {match.team1_score ?? '-'}
                            </span>
                            {team1Won && <div className="w-1 h-full absolute right-0 top-0 bg-orange-500" />}
                        </div>
                    </div>
                </div>

                {/* Team 2 */}
                <div
                    data-bracket-team-row
                    className={cn(
                        'flex h-[35px] items-center transition-colors',
                        team2Won && 'bg-slate-700/50',
                        team2Highlighted && 'bg-rose-500/20 text-white ring-1 ring-inset ring-rose-500/40',
                    )}
                    onMouseEnter={() => match.team2?.id && onTeamHover?.(match.team2.id)}
                    onMouseLeave={clearTeamHoverUnlessEnteringTeamRow}
                >
                    <SeedRail seed={match.team2?.seed} />
                    <div className="flex min-w-0 flex-1 items-center justify-between px-2.5">
                        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                            <EntityAvatar
                                src={match.team2?.logo_url}
                                name={match.team2?.name || '?'}
                                entityId={match.team2?.id}
                                type="team"
                                size="w-6 h-6"
                                className="rounded-sm"
                            />
                            <span className={cn('truncate text-xs font-medium', team2Won || team2Highlighted ? 'text-white' : 'text-slate-400')}>
                                {match.team2?.name || (isCompleted ? 'BYE' : 'TBD')}
                            </span>
                        </div>
                        <div className="flex shrink-0 items-center pl-2">
                            <span className={`text-sm font-bold tabular-nums ${team2Won ? 'text-orange-500' : 'text-slate-500'}`}>
                                {match.team2_score ?? '-'}
                            </span>
                            {team2Won && <div className="w-1 h-full absolute right-0 bottom-0 bg-orange-500" />}
                        </div>
                    </div>
                </div>

                {/* Footer - Match Timing */}
                <div
                    className="flex items-center justify-between h-[16px] px-2 bg-slate-900/50"
                    onMouseEnter={() => onTeamHover?.(null)}
                >
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
                    {matchCode && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-600">
                            {matchCode}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
