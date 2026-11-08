import React, { useMemo, useState } from 'react';
import { format as dateFmt, parseISO } from 'date-fns';
import { CalendarDays, ChevronDown, Clock, Search, X } from 'lucide-react';
import { getRoundName, BRACKET_SECTION_LABELS } from '@/components/tournament/schedule/roundNaming';
import { getTimezoneAbbr } from '@/lib/timeUtils';
import { cn } from '@/lib/utils';

interface ScheduleMatch {
    id: string;
    stage_id: string;
    format: string;
    round_index: number;
    bracket_type: string | null;
    scheduled_time: string | null;
    team1_name: string | null;
    team2_name: string | null;
    status: string;
    match_number: number;
}

interface RoundGroup {
    roundKey: string;
    roundIndex: number;
    bracketType: string | null;
    matches: ScheduleMatch[];
}

interface SchedulingConfig {
    self_play_enabled?: boolean;
    selfPlayEnabled?: boolean;
    scheduling_mode?: 'round_based' | 'granular';
    schedulingMode?: 'round_based' | 'granular';
    round_deadlines?: Record<string, string>;
    roundDeadlines?: Record<string, string>;
}

interface StageScheduleSectionProps {
    stageFormat: string;
    matches: ScheduleMatch[];
    schedulingConfig?: SchedulingConfig | null;
}

const SECTION_ORDER: Record<string, number> = { winners: 0, losers: 1, final: 2 };

function groupAndSortRounds(matches: ScheduleMatch[], stageFormat: string): RoundGroup[] {
    const isDE = stageFormat === 'double_elimination';
    const byKey = new Map<string, RoundGroup>();

    for (const m of matches) {
        const bracket = isDE ? (m.bracket_type || 'winners') : null;
        const key = bracket ? `${bracket}_${m.round_index}` : `all_${m.round_index}`;
        if (!byKey.has(key)) {
            byKey.set(key, { roundKey: key, roundIndex: m.round_index, bracketType: bracket, matches: [] });
        }
        byKey.get(key)!.matches.push(m);
    }

    const rows = [...byKey.values()];

    if (isDE) {
        rows.sort((a, b) => {
            const sa = SECTION_ORDER[a.bracketType ?? 'winners'] ?? 0;
            const sb = SECTION_ORDER[b.bracketType ?? 'winners'] ?? 0;
            if (sa !== sb) return sa - sb;
            return a.roundIndex - b.roundIndex;
        });
    } else {
        rows.sort((a, b) => a.roundIndex - b.roundIndex);
    }

    return rows;
}

function roundStatus(matches: ScheduleMatch[]): 'completed' | 'in_progress' | 'upcoming' {
    const allDone = matches.every((m) => m.status === 'completed' || m.status === 'bye');
    if (allDone) return 'completed';
    const anyActive = matches.some((m) => m.status === 'in_progress' || m.status === 'disputed');
    if (anyActive) return 'in_progress';
    return 'upcoming';
}

const statusDot: Record<string, string> = {
    completed: 'bg-emerald-500',
    in_progress: 'bg-amber-400 animate-pulse',
    upcoming: 'bg-zinc-700',
};

const matchStatusBadge = (status: string) => {
    if (status === 'completed') return { label: 'Done', cls: 'border-emerald-500/40 text-emerald-400' };
    if (status === 'in_progress') return { label: 'Live', cls: 'border-amber-500/40 text-amber-300' };
    if (status === 'disputed') return { label: 'Disputed', cls: 'border-rose-500/40 text-rose-400' };
    if (status === 'bye') return { label: 'Bye', cls: 'border-zinc-600 text-zinc-500' };
    return { label: 'Upcoming', cls: 'border-white/10 text-zinc-600' };
};

function matchesTeam(m: ScheduleMatch, q: string): boolean {
    return (m.team1_name?.toLowerCase().includes(q) ?? false)
        || (m.team2_name?.toLowerCase().includes(q) ?? false);
}

export default function StageScheduleSection({
    stageFormat,
    matches,
    schedulingConfig,
}: StageScheduleSectionProps) {
    const [expandedRound, setExpandedRound] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const rounds = groupAndSortRounds(matches, stageFormat);

    const query = search.trim().toLowerCase();
    const isSearching = query.length >= 2;

    const filteredRounds = useMemo(() => {
        if (!isSearching) return rounds;
        return rounds
            .map((r) => ({ ...r, matches: r.matches.filter((m) => matchesTeam(m, query)) }))
            .filter((r) => r.matches.length > 0);
    }, [rounds, isSearching, query]);

    const teamCount = useMemo(() => {
        const names = new Set<string>();
        for (const m of matches) {
            if (m.team1_name) names.add(m.team1_name);
            if (m.team2_name) names.add(m.team2_name);
        }
        return names.size;
    }, [matches]);

    if (rounds.length === 0) return null;

    const selfPlay = Boolean(schedulingConfig?.self_play_enabled ?? schedulingConfig?.selfPlayEnabled);
    const mode = selfPlay ? 'self_play' : (schedulingConfig?.scheduling_mode ?? schedulingConfig?.schedulingMode ?? 'round_based');
    const deadlines: Record<string, string> = {
        ...(schedulingConfig?.round_deadlines ?? {}),
        ...(schedulingConfig?.roundDeadlines ?? {}),
    };

    const isDE = stageFormat === 'double_elimination';
    const winnersRoundCount = rounds.filter((r) => !isDE || r.bracketType === 'winners').length;
    const tz = getTimezoneAbbr();

    const isGranular = mode === 'granular';

    let prevSection: string | null = null;

    return (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
            <div className="flex items-center gap-3 mb-3">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-zinc-500 flex items-center gap-2">
                    <CalendarDays className="w-3 h-3" />
                    {selfPlay ? 'Round Deadlines' : isGranular ? 'Match Schedule' : 'Round Schedule'} · {tz}
                </p>
                <span className="flex-1" />
                {teamCount > 4 && (
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Find team"
                            className="w-36 bg-white/[0.03] border border-white/[0.08] py-1 pl-7 pr-6 text-[11px] text-zinc-300 placeholder:text-zinc-700 font-mono focus:outline-none focus:border-white/20 transition-colors"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {isSearching && filteredRounds.length === 0 ? (
                <p className="text-xs text-zinc-600 py-3 text-center">No matches found for &ldquo;{search.trim()}&rdquo;</p>
            ) : (
            <div className="space-y-px">
                {filteredRounds.map((round) => {
                    const rStatus = roundStatus(round.matches);
                    const completedCount = round.matches.filter((m) => m.status === 'completed' || m.status === 'bye').length;
                    const totalCount = round.matches.length;

                    const deadlineKey = isDE && round.bracketType
                        ? `${round.bracketType}_${round.roundIndex}`
                        : String(round.roundIndex);
                    const selfPlayDeadline = selfPlay ? deadlines[deadlineKey] : null;

                    const scheduledMs = round.matches.filter((m) => m.scheduled_time);
                    const allSameTime = scheduledMs.length > 0 &&
                        scheduledMs.every((m) => m.scheduled_time === scheduledMs[0].scheduled_time);
                    const sharedTime = allSameTime ? scheduledMs[0].scheduled_time! : null;
                    const earliestTime = !allSameTime && scheduledMs.length > 0
                        ? [...scheduledMs].sort((a, b) => a.scheduled_time!.localeCompare(b.scheduled_time!))[0].scheduled_time!
                        : null;

                    const displayTime = selfPlayDeadline ?? sharedTime ?? earliestTime;

                    const sectionLabel = isDE && round.bracketType
                        ? BRACKET_SECTION_LABELS[round.bracketType] ?? null
                        : null;

                    const showSectionHeader = isDE && sectionLabel && round.bracketType !== prevSection;
                    prevSection = round.bracketType;

                    const roundLabel = round.bracketType === 'final'
                        ? 'Grand final'
                        : getRoundName(stageFormat, round.roundIndex, winnersRoundCount, round.bracketType === 'losers');

                    const isExpanded = isSearching || expandedRound === round.roundKey;
                    const canExpand = isSearching || isGranular || (selfPlay && totalCount > 0);

                    return (
                        <React.Fragment key={round.roundKey}>
                            {showSectionHeader && (
                                <div className="pt-2 pb-1 first:pt-0">
                                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
                                        {sectionLabel}
                                    </span>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={canExpand ? () => setExpandedRound(isExpanded ? null : round.roundKey) : undefined}
                                className={cn(
                                    'flex w-full items-center gap-3 py-2 px-3 text-xs transition-colors',
                                    canExpand ? 'hover:bg-white/[0.03] cursor-pointer' : 'cursor-default',
                                    isExpanded && 'bg-white/[0.02]',
                                )}
                            >
                                <div className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusDot[rStatus])} />

                                <span className="text-zinc-300 font-medium">{roundLabel}</span>

                                <span className="text-zinc-700 shrink-0">
                                    {rStatus === 'completed'
                                        ? `${totalCount}/${totalCount}`
                                        : completedCount > 0
                                            ? `${completedCount}/${totalCount} played`
                                            : `${totalCount} match${totalCount !== 1 ? 'es' : ''}`}
                                </span>

                                <span className="flex-1" />

                                <div className={cn(
                                    'shrink-0 flex items-center gap-1 font-mono',
                                    displayTime ? 'text-zinc-400' : 'text-zinc-700',
                                )}>
                                    <Clock className="h-3 w-3" />
                                    {displayTime ? (
                                        selfPlayDeadline ? (
                                            <>
                                                <span className="text-zinc-600">Due</span>
                                                <span>{dateFmt(parseISO(displayTime), 'MMM d')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{dateFmt(parseISO(displayTime), 'MMM d')}</span>
                                                <span className="text-zinc-600">·</span>
                                                <span>{dateFmt(parseISO(displayTime), 'HH:mm')}</span>
                                                {!allSameTime && scheduledMs.length > 1 && (
                                                    <span className="text-zinc-600" title="Multiple start times">+</span>
                                                )}
                                            </>
                                        )
                                    ) : (
                                        <span>TBA</span>
                                    )}
                                </div>

                                {canExpand && (
                                    <ChevronDown className={cn(
                                        'h-3 w-3 text-zinc-600 transition-transform',
                                        isExpanded && 'rotate-180',
                                    )} />
                                )}
                            </button>

                            {isExpanded && (
                                <div className="border-l-2 border-white/[0.06] ml-[7px] pl-5 pb-2 space-y-0.5">
                                    {round.matches.map((m) => {
                                        const badge = matchStatusBadge(m.status);
                                        const t1 = m.team1_name ?? 'TBD';
                                        const t2 = m.team2_name ?? 'TBD';
                                        const mTime = m.scheduled_time;
                                        const t1Hit = isSearching && m.team1_name?.toLowerCase().includes(query);
                                        const t2Hit = isSearching && m.team2_name?.toLowerCase().includes(query);

                                        return (
                                            <div key={m.id} className="flex items-center gap-3 py-1 text-xs">
                                                <span className="shrink-0 w-16 font-mono text-zinc-600">
                                                    {mTime ? dateFmt(parseISO(mTime), 'HH:mm') : 'TBA'}
                                                </span>
                                                <span className={cn('min-w-0 truncate', t1Hit ? 'text-rose-400 font-semibold' : m.team1_name ? 'text-zinc-300' : 'text-zinc-700')}>
                                                    {t1}
                                                </span>
                                                <span className="text-zinc-700 shrink-0">vs</span>
                                                <span className={cn('min-w-0 truncate', t2Hit ? 'text-rose-400 font-semibold' : m.team2_name ? 'text-zinc-300' : 'text-zinc-700')}>
                                                    {t2}
                                                </span>
                                                <span className="flex-1" />
                                                <span className={cn(
                                                    'shrink-0 border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider',
                                                    badge.cls,
                                                )}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            )}
        </div>
    );
}
