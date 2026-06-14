import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Check, AlertCircle, ChevronDown, ChevronUp, Zap, GitBranch, Globe, Info } from 'lucide-react';
import { useMatchScheduling } from '@/hooks/useMatchScheduling';
import { format, addDays, isWithinInterval, parseISO } from 'date-fns';
import { getTimezoneAbbr, utcToLocalInput, localInputToUTC, utcToLocalDate, utcToLocalTime, localDateTimeToUTC, dateInputToUTCEndOfDay, getTournamentScheduleDateBounds, isInvalidTournamentDateWindow, toUtcIsoString } from '@/lib/timeUtils';

interface RoundSchedulingPanelProps {
    stageId: string;
    stageFormat: string; // single_elimination, double_elimination, swiss, round_robin
    tournamentStartDate: string | null;
    tournamentEndDate: string | null;
    selfPlayEnabled: boolean;
    onScheduleApplied?: () => void;
}

interface RoundConfig {
    roundIndex: number;
    roundName: string;
    matchCount: number;
    deadline: string | null;
    startTime: string | null;
    bracketKey?: string | null; // 'winners' | 'losers' | 'final' — for DE config key scoping
}

// Bracket section for Double Elimination grouping
interface BracketSection {
    key: string;
    label: string;
    headerClasses: string;
    textClass: string;
    badgeClass: string;
    rounds: Map<number, any[]>;
}

const BRACKET_SECTIONS: Record<string, { label: string; headerClasses: string; textClass: string; badgeClass: string }> = {
    winners: {
        label: 'Winners Bracket',
        headerClasses: 'bg-white/[0.03] border-white/10',
        textClass: 'text-white',
        badgeClass: 'text-zinc-300 border-white/15',
    },
    losers: {
        label: 'Losers Bracket',
        headerClasses: 'bg-white/[0.03] border-white/10',
        textClass: 'text-white',
        badgeClass: 'text-zinc-300 border-white/15',
    },
    final: {
        label: 'Grand Finals',
        headerClasses: 'bg-rose-500/10 border-rose-500/20',
        textClass: 'text-rose-300',
        badgeClass: 'text-rose-300 border-rose-500/30',
    },
};

// Format-specific round naming
const getRoundNameForFormat = (
    format: string,
    roundIndex: number,
    totalRounds: number,
    isLosers: boolean = false
): string => {
    switch (format) {
        case 'double_elimination':
            if (isLosers) {
                return `Losers Round ${roundIndex + 1}`;
            }
            {
            const wRoundsFromEnd = totalRounds - roundIndex;
            if (wRoundsFromEnd === 0) return 'Grand Finals';
            if (wRoundsFromEnd === 1) return 'Winners Finals';
            if (wRoundsFromEnd === 2) return 'Winners Semi-Finals';
            return `Winners Round ${roundIndex + 1}`;
            }

        case 'swiss':
            return `Day ${roundIndex + 1} — Swiss Round ${roundIndex + 1}`;

        case 'round_robin':
            return `Day ${roundIndex + 1} — Matchday ${roundIndex + 1}`;

        case 'single_elimination':
        default:
            {
            const roundsFromEnd = totalRounds - roundIndex;
            if (roundsFromEnd === 0) return 'Grand Finals';
            if (roundsFromEnd === 1) return 'Finals';
            if (roundsFromEnd === 2) return 'Semi-Finals';
            if (roundsFromEnd === 3) return 'Quarter-Finals';
            return `Round ${roundIndex + 1}`;
            }
    }
};

// Format-specific descriptions
const formatDescriptions: Record<string, string> = {
    single_elimination: 'Set times/deadlines for each elimination round',
    double_elimination: 'Configure winners and losers bracket rounds',
    swiss: 'All matches in each round happen simultaneously',
    round_robin: 'Schedule matchdays - teams play once per day',
};

const RoundSchedulingPanel: React.FC<RoundSchedulingPanelProps> = ({
    stageId,
    stageFormat,
    tournamentStartDate,
    tournamentEndDate,
    selfPlayEnabled,
}) => {
    const { matches, schedulingConfig, updateConfig, isLoading, updateMatchTime } = useMatchScheduling(stageId);
    const [expandedRound, setExpandedRound] = useState<number | null>(0);
    const [expandedBracket, setExpandedBracket] = useState<string | null>(null);
    const [roundConfigs, setRoundConfigs] = useState<Map<string, RoundConfig>>(new Map());
    const [matchEdits, setMatchEdits] = useState<Map<string, string>>(new Map());
    const [saving, setSaving] = useState(false);
    const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

    const serverDeadlines = useMemo(() => ({
        ...((schedulingConfig as any)?.roundDeadlines ?? {}),
        ...((schedulingConfig as any)?.round_deadlines ?? {}),
    }), [schedulingConfig]);

    const configKey = useCallback((roundIndex: number, bracketKey?: string | null): string =>
        stageFormat === 'double_elimination' && bracketKey
            ? `${bracketKey}_${roundIndex}`
            : String(roundIndex),
    [stageFormat]);

    // Optimistic scheduling mode with instant UI
    const [optimisticMode, setOptimisticMode] = useState<'round_based' | 'granular' | null>(null);
    const schedulingMode = selfPlayEnabled
        ? 'round_based' as const
        : (optimisticMode || schedulingConfig?.scheduling_mode || 'round_based');

    const scheduleDateBounds = useMemo(
        () => getTournamentScheduleDateBounds(tournamentStartDate, tournamentEndDate),
        [tournamentStartDate, tournamentEndDate],
    );
    const invalidTournamentWindow = scheduleDateBounds.isInvalidWindow
        || isInvalidTournamentDateWindow(tournamentStartDate, tournamentEndDate);

    const handleSetMode = async (mode: 'round_based' | 'granular') => {
        if (selfPlayEnabled || mode === schedulingMode) return;
        setOptimisticMode(mode); // Instant UI update
        try {
            await updateConfig.mutateAsync({
                ...(schedulingConfig || {}),
                scheduling_mode: mode
            } as any);
        } catch (error) {
            console.error('[RoundScheduling] Failed to set mode:', error);
            setOptimisticMode(null); // Revert on failure
        }
    };

    // Group matches by config key — for DE, scoped by bracket_type + round_index
    const matchesByConfigKey = useMemo(() => {
        if (!matches) return new Map<string, typeof matches>();

        const grouped = new Map<string, typeof matches>();
        matches.forEach(match => {
            const bt = stageFormat === 'double_elimination' ? ((match as any).bracket_type || 'winners') : null;
            const key = configKey(match.round_index, bt);
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(match);
        });
        return grouped;
    }, [configKey, matches, stageFormat]);

    // Legacy flat grouping (used by non-DE rendering)
    const matchesByRound = useMemo(() => {
        if (!matches) return new Map<number, typeof matches>();

        const grouped = new Map<number, typeof matches>();
        matches.forEach(match => {
            const round = match.round_index;
            if (!grouped.has(round)) grouped.set(round, []);
            grouped.get(round)!.push(match);
        });
        return grouped;
    }, [matches]);

    // For Double Elimination: organize into bracket sections
    const bracketSections = useMemo((): BracketSection[] | null => {
        if (stageFormat !== 'double_elimination' || !matches || matches.length === 0) return null;

        const sectionMap = new Map<string, Map<number, typeof matches>>();

        matches.forEach(match => {
            const bt = (match as any).bracket_type || 'winners';
            if (!sectionMap.has(bt)) sectionMap.set(bt, new Map());
            const rounds = sectionMap.get(bt)!;
            if (!rounds.has(match.round_index)) rounds.set(match.round_index, []);
            rounds.get(match.round_index)!.push(match);
        });

        // Build ordered sections: winners → losers → final
        const order = ['winners', 'losers', 'final'];
        return order
            .filter(key => sectionMap.has(key))
            .map(key => ({
                key,
                label: BRACKET_SECTIONS[key]?.label || key,
                headerClasses: BRACKET_SECTIONS[key]?.headerClasses || 'bg-white/[0.03] border-white/10',
                textClass: BRACKET_SECTIONS[key]?.textClass || 'text-zinc-300',
                badgeClass: BRACKET_SECTIONS[key]?.badgeClass || 'text-zinc-300 border-white/15',
                rounds: sectionMap.get(key)!,
            }));
    }, [matches, stageFormat]);

    const totalRounds = matchesByRound.size;

    // Sync round rows from server whenever scheduling config or matches change.
    // Rows with unsaved local edits (dirtyKeys) are left untouched.
    React.useEffect(() => {
        if (matchesByConfigKey.size === 0) return;
        if (selfPlayEnabled && !schedulingConfig) return;

        setRoundConfigs(prev => {
            const next = new Map(prev);

            matchesByConfigKey.forEach((roundMatches, key) => {
                if (dirtyKeys.has(key)) return;

                const firstMatch = roundMatches[0];
                const existingTime = firstMatch?.scheduled_time
                    ? toUtcIsoString(firstMatch.scheduled_time)
                    : null;

                const roundIndex = firstMatch.round_index;
                const configDeadline = selfPlayEnabled
                    ? serverDeadlines[key] || existingTime
                    : existingTime;

                next.set(key, {
                    roundIndex,
                    roundName: getRoundNameForFormat(stageFormat, roundIndex, totalRounds),
                    matchCount: roundMatches.length,
                    deadline: configDeadline,
                    startTime: !selfPlayEnabled ? existingTime : null,
                    bracketKey: stageFormat === 'double_elimination'
                        ? ((firstMatch as any).bracket_type || null)
                        : null,
                });
            });

            return next;
        });
    }, [matchesByConfigKey, stageFormat, totalRounds, selfPlayEnabled, schedulingConfig, serverDeadlines, dirtyKeys]);

    // Calculate default dates based on format
    const getDefaultDeadline = (roundIndex: number): string => {
        if (!tournamentStartDate) return '';
        const startDate = parseISO(tournamentStartDate);

        let daysOffset = roundIndex;

        // For round robin, might need more spacing
        if (stageFormat === 'round_robin') {
            daysOffset = roundIndex; // 1 matchday per day
        }
        // For swiss, all rounds can be closer together
        else if (stageFormat === 'swiss') {
            daysOffset = roundIndex; // 1 round per day
        }

        const roundDate = addDays(startDate, daysOffset);
        roundDate.setHours(23, 59, 0, 0);
        return roundDate.toISOString();
    };

    // Validate date is within tournament window
    const isValidDate = (dateStr: string): boolean => {
        if (!dateStr) return true;
        if (invalidTournamentWindow) {
            if (!scheduleDateBounds.minDate) return true;
            return dateStr >= scheduleDateBounds.minDate;
        }
        if (!tournamentStartDate || !tournamentEndDate) return true;
        try {
            const date = parseISO(dateStr);
            return isWithinInterval(date, {
                start: parseISO(tournamentStartDate),
                end: parseISO(tournamentEndDate),
            });
        } catch {
            return false;
        }
    };

    const updateRoundConfig = (key: string, roundIndex: number, field: 'deadline' | 'startTime', value: string) => {
        setDirtyKeys(prev => new Set(prev).add(key));
        setRoundConfigs(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(key) || {
                roundIndex,
                roundName: getRoundNameForFormat(stageFormat, roundIndex, totalRounds),
                matchCount: matchesByConfigKey.get(key)?.length || 0,
                deadline: null,
                startTime: null,
            };
            newMap.set(key, { ...existing, [field]: value });
            return newMap;
        });
    };

    const handleSaveRound = async (key: string, roundIndex: number) => {
        const config = roundConfigs.get(key);
        if (!config) return;

        setSaving(true);
        try {
            if (selfPlayEnabled) {
                const newDeadlines = {
                    ...serverDeadlines,
                    [key]: config.deadline || getDefaultDeadline(roundIndex),
                };

                await updateConfig.mutateAsync({
                    ...(schedulingConfig as any),
                    round_deadlines: newDeadlines,
                    roundDeadlines: newDeadlines,
                });
            } else {
                const roundMatches = matchesByConfigKey.get(key) || [];
                const updates = roundMatches.map(match =>
                    updateMatchTime.mutateAsync({
                        matchId: match.id,
                        scheduledTime: config.startTime
                    })
                );
                await Promise.all(updates);
            }
            setDirtyKeys(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        } catch (error) {
            console.error('[RoundScheduling] Failed to save round schedule:', error);
        } finally {
            setSaving(false);
        }
    };

    const updateMatchEdit = (matchId: string, value: string) => {
        setMatchEdits(prev => {
            const newMap = new Map(prev);
            newMap.set(matchId, value);
            return newMap;
        });
    };

    const handleSaveMatch = async (matchId: string) => {
        const time = matchEdits.get(matchId);
        if (!time) return;

        setSaving(true);
        try {
            await updateMatchTime.mutateAsync({
                matchId,
                scheduledTime: time
            });
            // Clear the local edit so it falls back to the now-updated server time
            setMatchEdits(prev => {
                const newMap = new Map(prev);
                newMap.delete(matchId);
                return newMap;
            });
        } catch (error) {
            console.error('[RoundScheduling] Failed to save match time:', error);
        } finally {
            setSaving(false);
        }
    };

    // Shared render function for a single round row (used by both DE sections and flat list)
    const renderRoundRow = (
        roundIndex: number,
        roundMatches: any[],
        roundName: string,
        config: RoundConfig | undefined,
        isExpanded: boolean,
        defaultDeadline: string,
        bracketKey: string | null,
        cfgKey: string
    ) => {
        const handleToggle = () => {
            if (isExpanded) {
                setExpandedRound(null);
                setExpandedBracket(null);
            } else {
                setExpandedRound(roundIndex);
                setExpandedBracket(bracketKey);
            }
        };

        return (
            <motion.div
                key={`${bracketKey || 'flat'}_${roundIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: roundIndex * 0.05 }}
                className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors"
            >
                {/* Round Header */}
                <button
                    onClick={handleToggle}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-300 font-bold">
                            {roundIndex + 1}
                        </div>
                        <div>
                            <h4 className="font-medium text-white">
                                {roundName}
                            </h4>
                            <p className="text-xs text-gray-500">
                                {roundMatches.length} match{roundMatches.length !== 1 ? 'es' : ''}
                                {stageFormat === 'swiss' && ' (simultaneous)'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {(config?.deadline || config?.startTime) && (
                            <span className="text-xs text-rose-300 bg-rose-500/10 px-2 py-1 rounded-lg">
                                Configured
                            </span>
                        )}
                        {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                    </div>
                </button>

                {/* Round Config (Expanded) */}
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                        animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                        exit={{ opacity: 0, gridTemplateRows: '0fr' }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'grid', overflow: 'hidden' }}
                        className="border-t border-white/5"
                    >
                    <div style={{ minHeight: 0, overflow: 'hidden' }} className="px-4 pb-4">
                        <div className="pt-4 space-y-4">
                            {selfPlayEnabled ? (
                                <div className="space-y-2">
                                    <Label className="text-gray-400 text-sm">
                                        Round Deadline (End of Day)
                                        <span className="ml-1 text-rose-300/70">({getTimezoneAbbr()})</span>
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="date"
                                            value={config?.deadline ? utcToLocalDate(config.deadline) : ''}
                                            min={scheduleDateBounds.minDate}
                                            max={scheduleDateBounds.maxDate || undefined}
                                            onChange={(e) => {
                                                const dateValue = e.target.value;
                                                const utcValue = dateValue ? dateInputToUTCEndOfDay(dateValue) : '';
                                                updateRoundConfig(cfgKey, roundIndex, 'deadline', utcValue);
                                            }}
                                            className="bg-[#0a0a0c] border-white/10 text-white rounded-xl focus:border-rose-500 focus:ring-rose-500/20 flex-1 [color-scheme:dark]"
                                        />
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleSaveRound(cfgKey, roundIndex)}
                                            disabled={saving || !dirtyKeys.has(cfgKey) || !config?.deadline}
                                            className={!dirtyKeys.has(cfgKey) && (config?.deadline || serverDeadlines[cfgKey])
                                                ? "bg-rose-500/5 text-rose-300/60 border border-rose-500/10 rounded-xl px-4 cursor-default"
                                                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl px-4"}
                                        >
                                            {saving ? '...' : (!dirtyKeys.has(cfgKey) && (config?.deadline || serverDeadlines[cfgKey])) ? <><Check className="w-3.5 h-3.5 mr-1 inline" />Saved</> : 'Save'}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Teams have until the end of this day to complete their match
                                    </p>
                                    {config?.deadline && !isValidDate(config.deadline) && (
                                        <p className="text-xs text-rose-300 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Date must be within tournament window
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Round Deadline (only shown in round-based mode to save space) */}
                                    {schedulingMode === 'round_based' && (
                                        <div className="space-y-2">
                                            <Label className="text-gray-400 text-sm">
                                                Round Deadline (End of Day)
                                                <span className="ml-1 text-rose-300/70">({getTimezoneAbbr()})</span>
                                            </Label>
                                            <Input
                                                type="date"
                                                value={config?.deadline ? utcToLocalDate(config.deadline) : ''}
                                                min={scheduleDateBounds.minDate}
                                                max={scheduleDateBounds.maxDate || undefined}
                                                onChange={(e) => {
                                                    const dateValue = e.target.value;
                                                    const utcValue = dateValue ? dateInputToUTCEndOfDay(dateValue) : '';
                                                    updateRoundConfig(cfgKey, roundIndex, 'deadline', utcValue);
                                                    // Also update startTime if a time is already set
                                                    if (dateValue && config?.startTime) {
                                                        const existingTime = utcToLocalTime(config.startTime);
                                                        updateRoundConfig(cfgKey, roundIndex, 'startTime', localDateTimeToUTC(dateValue, existingTime));
                                                    }
                                                }}
                                                className="bg-[#0a0a0c] border-white/10 text-white rounded-xl focus:border-rose-500 focus:ring-rose-500/20 [color-scheme:dark]"
                                            />
                                        </div>
                                    )}

                                    {schedulingMode === 'round_based' ? (
                                        /* Round-Based: single start time for all matches */
                                        <>
                                            <div className="space-y-2">
                                                <Label className="text-gray-400 text-sm">
                                                    {stageFormat === 'swiss' ? 'Round Start Time' : 'Match Start Time'}
                                                    <span className="ml-1 text-rose-300/70">({getTimezoneAbbr()})</span>
                                                </Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="time"
                                                        value={config?.startTime ? utcToLocalTime(config.startTime) : ''}
                                                        onChange={(e) => {
                                                            const timeVal = e.target.value;
                                                            if (!timeVal) {
                                                                updateRoundConfig(cfgKey, roundIndex, 'startTime', '');
                                                                return;
                                                            }
                                                            // Combine deadline date (or today) with selected time
                                                            const deadlineDate = config?.deadline
                                                                ? utcToLocalDate(config.deadline)
                                                                : (defaultDeadline ? utcToLocalDate(defaultDeadline) : utcToLocalDate(new Date().toISOString()));
                                                            updateRoundConfig(cfgKey, roundIndex, 'startTime', localDateTimeToUTC(deadlineDate, timeVal));
                                                        }}
                                                        className="bg-[#0a0a0c] border-white/10 text-white rounded-xl focus:border-rose-500 focus:ring-rose-500/20 flex-1 [color-scheme:dark]"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => handleSaveRound(cfgKey, roundIndex)}
                                                        disabled={saving || !dirtyKeys.has(cfgKey)}
                                                        className={!dirtyKeys.has(cfgKey) && config?.startTime
                                                            ? "bg-rose-500/5 text-rose-300/60 border border-rose-500/10 rounded-xl px-4 cursor-default"
                                                            : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl px-4"}
                                                    >
                                                        {saving ? '...' : (!dirtyKeys.has(cfgKey) && config?.startTime) ? <><Check className="w-3.5 h-3.5 mr-1 inline" />Saved</> : 'Save'}
                                                    </Button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                All {roundMatches.length} match{roundMatches.length !== 1 ? 'es' : ''} in this round will start at this time
                                            </p>
                                        </>
                                    ) : (
                                        /* Granular: individual match time pickers */
                                        <div className="pt-2 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                                    Individual Match Times
                                                </Label>
                                                <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-300 bg-rose-500/5">
                                                    Match-by-Match
                                                </Badge>
                                            </div>

                                            <div className="space-y-2.5">
                                                {roundMatches.map((match) => {
                                                    const matchId = match.id;
                                                    const matchNum = match.match_number;
                                                    const team1 = (match as any).team1_name || (match as any).team1?.name || 'TBD';
                                                    const team2 = (match as any).team2_name || (match as any).team2?.name || 'TBD';
                                                    const editedTime = matchEdits.get(matchId);
                                                    // The editedTime in state is stored in UTC, so we must convert it back to local for the input display
                                                    const displayTime = editedTime
                                                        ? utcToLocalInput(editedTime)
                                                        : (match.scheduled_time ? utcToLocalInput(match.scheduled_time) : '');

                                                    return (
                                                        <div key={matchId} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-gray-600 font-bold bg-white/5 px-1.5 py-0.5 rounded">M{matchNum}</span>
                                                                    <span className="text-xs text-gray-300 font-medium">
                                                                        {team1} <span className="text-gray-600 mx-1">vs</span> {team2}
                                                                    </span>
                                                                </div>
                                                                {match.scheduled_time && !editedTime && (
                                                                    <Badge variant="outline" className="text-[10px] border-rose-500/20 text-rose-300 bg-rose-500/5">
                                                                        Scheduled
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Input
                                                                    type="datetime-local"
                                                                    value={displayTime ? displayTime.slice(0, 16) : ''}
                                                                    onChange={(e) => updateMatchEdit(matchId, e.target.value ? localInputToUTC(e.target.value) : '')}
                                                                    className="h-8 bg-[#0a0a0c] border-white/5 text-[11px] text-white rounded-lg focus:border-rose-500 focus:ring-rose-500/20 flex-1 [color-scheme:dark]"
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleSaveMatch(matchId)}
                                                                    disabled={saving || !matchEdits.has(matchId)}
                                                                    className="h-8 px-3 bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 text-[10px] rounded-lg transition-all"
                                                                >
                                                                    {saving ? '...' : 'Set Time'}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {config?.startTime && !isValidDate(config.startTime) && schedulingMode === 'round_based' && (
                                        <p className="text-xs text-rose-300 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Date must be within tournament window
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    </motion.div>
                )}
            </motion.div>
        );
    };

    if (isLoading) {
        return (
            <Card className="bg-[#0a0a0c] border-white/5 rounded-3xl">
                <CardContent className="p-8">
                    <div className="animate-shimmer flex flex-col gap-4">
                        <div className="h-6 bg-white/5 rounded-lg w-3/4"></div>
                        <div className="h-20 bg-white/5 rounded-2xl"></div>
                        <div className="h-20 bg-white/5 rounded-2xl"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const formatLabel = stageFormat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return (
        <Card className="bg-[#0a0a0c] border-white/5 rounded-3xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-white font-heading text-xl">
                        <div className="p-2 bg-rose-500/10 rounded-xl">
                            <Calendar className="w-5 h-5 text-rose-400" />
                        </div>
                        Round Scheduling
                    </CardTitle>
                    <Badge className="bg-rose-500/10 text-rose-300 border-rose-500/20">
                        <GitBranch className="w-3 h-3 mr-1" />
                        {formatLabel}
                    </Badge>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                    {formatDescriptions[stageFormat] || formatDescriptions.single_elimination}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-300/70">
                    <Globe className="w-3 h-3" />
                    <span>All times shown in your local timezone ({getTimezoneAbbr()})</span>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
                {/* Tournament Date Info */}
                {(tournamentStartDate || tournamentEndDate) && (
                    <div className={`flex items-center gap-3 p-4 border rounded-2xl ${invalidTournamentWindow ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                        <Clock className={`w-5 h-5 ${invalidTournamentWindow ? 'text-rose-300' : 'text-rose-400'}`} />
                        <div className="text-sm">
                            <span className="text-gray-400">Tournament Window: </span>
                            <span className="text-white font-medium">
                                {tournamentStartDate && format(parseISO(tournamentStartDate), 'MMM d')}
                                {' — '}
                                {tournamentEndDate && format(parseISO(tournamentEndDate), 'MMM d, yyyy')}
                            </span>
                            {invalidTournamentWindow && (
                                <p className="mt-1 text-xs text-rose-300">
                                    End date is before start date. Update tournament dates via Edit Tournament — schedule pickers are open from start date onward until fixed.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Scheduling Mode Selector */}
                {selfPlayEnabled ? (
                    /* Self-Play: auto round-based, info banner */
                    <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                        <Zap className="w-5 h-5 text-rose-400" />
                        <div className="text-sm">
                            <span className="text-rose-300 font-medium">Self-Play Mode</span>
                            <span className="text-gray-400 ml-2">— Round-based deadlines. Teams propose times to each other and play within the deadline.</span>
                        </div>
                    </div>
                ) : (
                    /* Manual Mode: show mode selector cards */
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-500">Choose how to schedule matches in this stage</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Round-Based Card */}
                            <button
                                onClick={() => handleSetMode('round_based')}
                                className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${schedulingMode === 'round_based'
                                    ? 'border-rose-500 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.08)]'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                                    }`}
                            >
                                {schedulingMode === 'round_based' && (
                                    <div className="absolute top-3 right-3">
                                        <Check className="w-4 h-4 text-rose-400" />
                                    </div>
                                )}
                                <Clock className={`w-6 h-6 mb-2 ${schedulingMode === 'round_based' ? 'text-rose-400' : 'text-gray-500'}`} />
                                <h4 className={`text-sm font-semibold mb-1 ${schedulingMode === 'round_based' ? 'text-white' : 'text-gray-300'}`}>
                                    Round-Based
                                </h4>
                                <p className="text-[11px] text-gray-500 leading-relaxed">
                                    One start time per round. All matches in a round share the same schedule.
                                </p>
                            </button>

                            {/* Granular Card */}
                            <button
                                onClick={() => handleSetMode('granular')}
                                className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${schedulingMode === 'granular'
                                    ? 'border-rose-500 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.08)]'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                                    }`}
                            >
                                {schedulingMode === 'granular' && (
                                    <div className="absolute top-3 right-3">
                                        <Check className="w-4 h-4 text-rose-400" />
                                    </div>
                                )}
                                <GitBranch className={`w-6 h-6 mb-2 ${schedulingMode === 'granular' ? 'text-rose-400' : 'text-gray-500'}`} />
                                <h4 className={`text-sm font-semibold mb-1 ${schedulingMode === 'granular' ? 'text-white' : 'text-gray-300'}`}>
                                    Match-by-Match
                                </h4>
                                <p className="text-[11px] text-gray-500 leading-relaxed">
                                    Individual time for every match. Perfect for streamed playoffs and finals.
                                </p>
                            </button>
                        </div>
                    </div>
                )}

                {/* Rounds List */}
                <ScrollArea className="h-[400px] pr-2">
                    <div className="space-y-3">
                        {bracketSections ? (
                            /* Double Elimination: render separate bracket sections */
                            bracketSections.map(section => (
                                <div key={section.key} className="space-y-2">
                                    {/* Bracket Section Header */}
                                    <div className={`flex items-center gap-3 px-4 py-3 ${section.headerClasses} border rounded-2xl`}>
                                        <h3 className={`font-heading font-semibold ${section.textClass} text-sm uppercase tracking-wider`}>
                                            {section.label}
                                        </h3>
                                        <Badge variant="outline" className={`ml-auto ${section.badgeClass} text-xs`}>
                                            {section.rounds.size} round{section.rounds.size !== 1 ? 's' : ''}
                                        </Badge>
                                    </div>

                                    {/* Rounds within this bracket section */}
                                    {Array.from(section.rounds.entries())
                                        .sort(([a], [b]) => a - b)
                                        .map(([roundIndex, roundMatches]) => {
                                            const cfgK = configKey(roundIndex, section.key);
                                            const config = roundConfigs.get(cfgK);
                                            const isExpanded = expandedRound === roundIndex && expandedBracket === section.key;
                                            const defaultDeadline = getDefaultDeadline(roundIndex);
                                            const isLosers = section.key === 'losers';
                                            const sectionRoundCount = section.rounds.size;
                                            const roundName = section.key === 'final'
                                                ? 'Grand Finals'
                                                : getRoundNameForFormat(stageFormat, roundIndex, sectionRoundCount, isLosers);

                                            return renderRoundRow(
                                                roundIndex,
                                                roundMatches,
                                                roundName,
                                                config,
                                                isExpanded,
                                                defaultDeadline,
                                                section.key,
                                                cfgK
                                            );
                                        })}
                                </div>
                            ))
                        ) : (
                            /* All other formats: flat round list */
                            Array.from(matchesByRound.entries())
                                .sort(([a], [b]) => a - b)
                                .map(([roundIndex, roundMatches]) => {
                                    const cfgK = configKey(roundIndex, null);
                                    const config = roundConfigs.get(cfgK);
                                    const isExpanded = expandedRound === roundIndex && expandedBracket === null;
                                    const defaultDeadline = getDefaultDeadline(roundIndex);
                                    const roundName = getRoundNameForFormat(stageFormat, roundIndex, totalRounds);

                                    return renderRoundRow(
                                        roundIndex,
                                        roundMatches,
                                        roundName,
                                        config,
                                        isExpanded,
                                        defaultDeadline,
                                        null,
                                        cfgK
                                    );
                                })
                        )}
                    </div>
                </ScrollArea>

                {/* No Matches Warning */}
                {matchesByConfigKey.size === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                        <p className="text-sm text-rose-300">
                            No matches found. Generate the bracket first.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RoundSchedulingPanel;
