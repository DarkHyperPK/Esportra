import type { KeyboardEvent, MouseEvent } from 'react';
import { BarChart3 } from 'lucide-react';
import { formatLocalTime } from '@/lib/timeUtils';
import { cn } from '@/lib/utils';
import { formatBracketMatchLabel } from '@/utils/bracketMatchLabel';
import { TeamCrest } from './TeamCrest';

interface ReadOnlyBracketTeam {
    id?: string | null;
    name?: string;
    seed?: number | null;
    logo_url?: string | null;
}

interface ReadOnlyBracketMatch {
    id?: string | number;
    status?: string;
    team1_score?: number | null;
    team2_score?: number | null;
    team1?: ReadOnlyBracketTeam | null;
    team2?: ReadOnlyBracketTeam | null;
    winner?: { id?: string | null } | null;
    scheduledTime?: string | null;
    scheduled_time?: string | null;
    round?: number;
    matchNumber?: number;
    bracketSide?: string | null;
    /** Raw rows (organizer overview) carry these instead of round / matchNumber. */
    round_index?: number;
    match_number?: number;
}

/** Where this card sits relative to a found or hovered team's route. */
export type MatchRouteState = 'played' | 'ahead' | 'off';

interface ReadOnlyMatchCardProps {
    match: ReadOnlyBracketMatch;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    className?: string;
    onClick?: () => void;
    hasAutomatedResults?: boolean;
    hasProofs?: boolean;
    hoveredTeamId?: string | null;
    onTeamHover?: (teamId: string | null) => void;
    isDoubleElimination?: boolean;
    label?: string;
    /** Set by the bracket tree; left undefined, standalone cards dim when the hovered team isn't in them. */
    routeState?: MatchRouteState | null;
    /** The match being edited (bracket runner). */
    selected?: boolean;
}

const isLive = (status?: string) => status === 'in_progress' || status === 'live';

type RowProps = {
    team?: ReadOnlyBracketTeam | null;
    score?: number | null;
    won: boolean;
    lost: boolean;
    lit: boolean;
    decided: boolean;
    divided?: boolean;
    onHover?: (teamId: string | null) => void;
};

/** One team line: seed, crest, name, score. Winner reads white, the other side grey. */
const TeamRow = ({ team, score, won, lost, lit, decided, divided, onHover }: RowProps) => {
    const name = team?.name;
    const seed = typeof team?.seed === 'number' && team.seed > 0 ? team.seed : null;
    return (
        <div
            data-bracket-team-row
            className={cn('relative flex h-[30px] items-center pr-3 transition-colors', divided && 'border-t border-white/[0.05]', won && 'bg-white/[0.035]', lit && 'bg-rose-500/[0.08]')}
            onMouseEnter={() => team?.id && onHover?.(team.id)}
        >
            {won ? <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-white/80" /> : null}
            <span className="w-7 shrink-0 text-center font-mono text-[10px] tabular-nums text-zinc-600">{seed ?? ''}</span>
            {name ? <TeamCrest name={name} logoUrl={team?.logo_url} /> : <span aria-hidden className="h-5 w-5 shrink-0 border border-dashed border-white/10" />}
            <span
                className={cn(
                    'ml-2 min-w-0 flex-1 truncate text-[13px]',
                    !name && 'font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-600',
                    name && (won || lit ? 'font-semibold text-white' : lost ? 'text-zinc-500' : 'text-zinc-200'),
                )}
            >
                {name ?? (decided ? 'Bye' : 'TBD')}
            </span>
            <span
                className={cn(
                    'w-6 shrink-0 text-right font-heading text-[15px] font-extrabold tabular-nums',
                    won ? 'text-white' : lost ? 'text-zinc-600' : 'text-zinc-400',
                )}
            >
                {score ?? (name ? '–' : '')}
            </span>
        </div>
    );
};

function stateCaption(match: ReadOnlyBracketMatch) {
    if (isLive(match.status)) return 'live';
    if (match.status === 'completed') return 'Final';
    const time = match.scheduledTime ?? match.scheduled_time;
    return time ? formatLocalTime(time, 'MMM d · h:mm a') : '';
}

/**
 * The scorebug: a caption strip (match code, live / time / final) over two team
 * rows. Square, quiet, winner white; rose only for a live match or a lit route.
 */
export const ReadOnlyMatchCard = ({
    match, x, y, width = 248, height = 84, className, onClick, hasAutomatedResults,
    hoveredTeamId, onTeamHover, isDoubleElimination = false, label, routeState, selected = false,
}: ReadOnlyMatchCardProps) => {
    const winnerId = match.winner?.id ?? null;
    const decided = match.status === 'completed';
    const team1Won = Boolean(winnerId && winnerId === match.team1?.id);
    const team2Won = Boolean(winnerId && winnerId === match.team2?.id);
    const live = isLive(match.status);
    const teamInMatch = Boolean(hoveredTeamId && (match.team1?.id === hoveredTeamId || match.team2?.id === hoveredTeamId));
    // undefined: work it out from the hovered team; null: the caller wants no route styling.
    const route: MatchRouteState | null = routeState !== undefined ? routeState : hoveredTeamId ? (teamInMatch ? 'played' : 'off') : null;
    const labelInput = {
        round: match.round ?? (typeof match.round_index === 'number' ? match.round_index + 1 : undefined),
        matchNumber: match.matchNumber ?? match.match_number,
        bracketSide: match.bracketSide,
    };
    const code = (label ?? formatBracketMatchLabel(labelInput, { isDoubleElimination }))?.replace(/\./g, ' · ');
    const caption = stateCaption(match);
    const interactive = Boolean(onClick);

    const clearHover = (event: MouseEvent) => {
        if (!onTeamHover || !hoveredTeamId) return;
        const related = event.relatedTarget;
        if (related instanceof Element && related.closest('[data-bracket-team-row]')) return;
        onTeamHover(null);
    };
    const activate = () => {
        onTeamHover?.(null);
        onClick?.();
    };
    const onKeyDown = (event: KeyboardEvent) => {
        if (!interactive || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        activate();
    };

    return (
        <div
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? `${code ?? 'Match'}: ${match.team1?.name ?? 'TBD'} vs ${match.team2?.name ?? 'TBD'}` : undefined}
            className={cn(
                'group bg-card transition-[box-shadow,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]',
                interactive && 'cursor-pointer hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]',
                live && 'shadow-[inset_0_0_0_1px_rgba(244,63,94,0.55)]',
                route === 'played' && 'shadow-[inset_0_0_0_1px_rgba(244,63,94,0.7)]',
                route === 'ahead' && 'opacity-80 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.3)]',
                route === 'off' && 'opacity-35',
                selected && 'opacity-100',
                className,
            )}
            style={x !== undefined && y !== undefined ? { position: 'absolute', left: x, top: y, width, height } : { position: 'relative', minWidth: width, height }}
            onClick={interactive ? activate : undefined}
            onKeyDown={onKeyDown}
            onMouseLeave={clearHover}
        >
            {selected ? <span aria-hidden className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.9)]" /> : null}
            <div className="flex h-6 items-center justify-between border-b border-white/[0.06] px-2.5" onMouseEnter={() => onTeamHover?.(null)}>
                <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{code ?? ''}</span>
                <span className="flex items-center gap-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em]">
                    {hasAutomatedResults ? <BarChart3 aria-label="Match stats available" className="h-3 w-3 text-zinc-500" /> : null}
                    {caption === 'live' ? (
                        <span className="flex items-center gap-1.5 text-rose-400">
                            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                            Live
                        </span>
                    ) : (
                        <span className="text-zinc-500">{caption}</span>
                    )}
                </span>
            </div>
            <TeamRow
                team={match.team1} score={match.team1_score} won={team1Won} lost={decided && team2Won}
                lit={Boolean(hoveredTeamId && match.team1?.id === hoveredTeamId)} decided={decided} onHover={onTeamHover}
            />
            <TeamRow
                divided team={match.team2} score={match.team2_score} won={team2Won} lost={decided && team1Won}
                lit={Boolean(hoveredTeamId && match.team2?.id === hoveredTeamId)} decided={decided} onHover={onTeamHover}
            />
        </div>
    );
};

export default ReadOnlyMatchCard;
