import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Check, AlertCircle, ChevronDown, ChevronUp, Zap, GitBranch, Globe } from 'lucide-react';
import { useMatchScheduling } from '@/hooks/useMatchScheduling';
import { format, addDays, isWithinInterval, parseISO } from 'date-fns';
import { getTimezoneAbbr, utcToLocalInput, localInputToUTC, utcToLocalDate, dateInputToUTCEndOfDay } from '@/lib/timeUtils';

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
}

// Bracket section for Double Elimination grouping
interface BracketSection {
    key: string;
    label: string;
    icon: string;
    headerClasses: string;
    textClass: string;
    badgeClass: string;
    rounds: Map<number, any[]>;
}

const BRACKET_SECTIONS: Record<string, { label: string; icon: string; headerClasses: string; textClass: string; badgeClass: string }> = {
    winners: {
        label: 'Winners Bracket',
        icon: '🏆',
        headerClasses: 'bg-esports-accent/10 border-esports-accent/20',
        textClass: 'text-esports-accent',
        badgeClass: 'text-esports-accent border-esports-accent/30',
    },
    losers: {
        label: 'Losers Bracket',
        icon: '⚔️',
        headerClasses: 'bg-amber-500/10 border-amber-500/20',
        textClass: 'text-amber-500',
        badgeClass: 'text-amber-500 border-amber-500/30',
    },
    final: {
        label: 'Grand Finals',
        icon: '👑',
        headerClasses: 'bg-esports-purple/10 border-esports-purple/20',
        textClass: 'text-esports-purple',
        badgeClass: 'text-esports-purple border-esports-purple/30',
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
            const wRoundsFromEnd = totalRounds - roundIndex;
            if (wRoundsFromEnd === 0) return 'Grand Finals';
            if (wRoundsFromEnd === 1) return 'Winners Finals';
            if (wRoundsFromEnd === 2) return 'Winners Semi-Finals';
            return `Winners Round ${roundIndex + 1}`;

        case 'swiss':
            return `Day ${roundIndex + 1} — Swiss Round ${roundIndex + 1}`;

        case 'round_robin':
            return `Day ${roundIndex + 1} — Matchday ${roundIndex + 1}`;

        case 'single_elimination':
        default:
            const roundsFromEnd = totalRounds - roundIndex;
            if (roundsFromEnd === 0) return 'Grand Finals';
            if (roundsFromEnd === 1) return 'Finals';
            if (roundsFromEnd === 2) return 'Semi-Finals';
            if (roundsFromEnd === 3) return 'Quarter-Finals';
            return `Round ${roundIndex + 1}`;
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
    onScheduleApplied
}) => {
    const { matches, schedulingConfig, updateConfig, isLoading, updateMatchTime } = useMatchScheduling(stageId);
    const [expandedRound, setExpandedRound] = useState<number | null>(0);
    const [expandedBracket, setExpandedBracket] = useState<string | null>(null);
    const [roundConfigs, setRoundConfigs] = useState<Map<number, RoundConfig>>(new Map());
    const [saving, setSaving] = useState(false);

    // Group matches by round — for DE, also group by bracket_type
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
                icon: BRACKET_SECTIONS[key]?.icon || '📋',
                headerClasses: BRACKET_SECTIONS[key]?.headerClasses || 'bg-gray-500/10 border-gray-500/20',
                textClass: BRACKET_SECTIONS[key]?.textClass || 'text-gray-500',
                badgeClass: BRACKET_SECTIONS[key]?.badgeClass || 'text-gray-500 border-gray-500/30',
                rounds: sectionMap.get(key)!,
            }));
    }, [matches, stageFormat]);

    const totalRounds = matchesByRound.size;

    // Initialize configs from fetched matches
    React.useEffect(() => {
        // Wait for matches AND config (if self-play) to be ready
        if (matchesByRound.size > 0 && roundConfigs.size === 0 && (!selfPlayEnabled || schedulingConfig)) {
            const newConfigs = new Map<number, RoundConfig>();
            matchesByRound.forEach((matches, roundIndex) => {
                const firstMatch = matches[0];
                const existingTime = firstMatch?.scheduled_time
                    ? new Date(firstMatch.scheduled_time).toISOString().slice(0, 16)
                    : null;

                // For self-play, prefer config deadline, fallback to existingTime
                const configDeadline = selfPlayEnabled
                    ? schedulingConfig?.round_deadlines?.[String(roundIndex)] || existingTime
                    : null;

                newConfigs.set(roundIndex, {
                    roundIndex,
                    roundName: getRoundNameForFormat(stageFormat, roundIndex, totalRounds),
                    matchCount: matches.length,
                    deadline: selfPlayEnabled ? configDeadline : null,
                    startTime: !selfPlayEnabled ? existingTime : null,
                });
            });
            setRoundConfigs(newConfigs);
        }
    }, [matchesByRound, stageFormat, totalRounds, selfPlayEnabled, roundConfigs.size, schedulingConfig]);

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
        return roundDate.toISOString().slice(0, 16);
    };

    // Validate date is within tournament window
    const isValidDate = (dateStr: string): boolean => {
        if (!tournamentStartDate || !tournamentEndDate || !dateStr) return true;
        try {
            const date = parseISO(dateStr);
            return isWithinInterval(date, {
                start: parseISO(tournamentStartDate),
                end: parseISO(tournamentEndDate)
            });
        } catch {
            return false;
        }
    };

    const updateRoundConfig = (roundIndex: number, field: 'deadline' | 'startTime', value: string) => {
        setRoundConfigs(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(roundIndex) || {
                roundIndex,
                roundName: getRoundNameForFormat(stageFormat, roundIndex, totalRounds),
                matchCount: matchesByRound.get(roundIndex)?.length || 0,
                deadline: null,
                startTime: null,
            };
            newMap.set(roundIndex, { ...existing, [field]: value });
            return newMap;
        });
    };

    const handleApplySchedule = async () => {
        setSaving(true);
        try {
            if (selfPlayEnabled) {
                // For self-play, update the STAGE CONFIG with round deadlines
                // Merge with existing config to avoid data loss
                const newDeadlines: Record<string, string> = { ...(schedulingConfig?.round_deadlines || {}) };
                for (const [roundIndex, _] of matchesByRound) {
                    const config = roundConfigs.get(roundIndex);
                    const deadline = config?.deadline || getDefaultDeadline(roundIndex);
                    newDeadlines[String(roundIndex)] = deadline;
                }

                // Update stage config
                await updateConfig.mutateAsync({
                    ...schedulingConfig, // Merge existing fields
                    round_deadlines: newDeadlines
                } as any); // Cast to handle the Partial mismatch if strict

                onScheduleApplied?.();

            } else {
                // For scheduled mode, update MATCH TIMES directly
                const updates: Promise<void>[] = [];
                for (const [roundIndex, roundMatches] of matchesByRound) {
                    const config = roundConfigs.get(roundIndex);
                    const startTime = config?.startTime;

                    if (startTime) {
                        for (const match of roundMatches) {
                            updates.push(
                                updateMatchTime.mutateAsync({
                                    matchId: match.id,
                                    scheduledTime: startTime
                                })
                            );
                        }
                    }
                }
                await Promise.all(updates);
                onScheduleApplied?.();
            }

        } catch (error) {
            console.error('Failed to apply schedule:', error);
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
        bracketKey: string | null
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
                        <div className="w-10 h-10 rounded-xl bg-esports-accent/10 flex items-center justify-center text-esports-accent font-bold">
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
                            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
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
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 border-t border-white/5"
                    >
                        <div className="pt-4 space-y-4">
                            {selfPlayEnabled ? (
                                <div className="space-y-2">
                                    <Label className="text-gray-400 text-sm">
                                        Round Deadline (End of Day)
                                        <span className="ml-1 text-esports-accent/60">({getTimezoneAbbr()})</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        value={config?.deadline ? utcToLocalDate(config.deadline) : (defaultDeadline ? defaultDeadline.split('T')[0] : '')}
                                        min={tournamentStartDate ? utcToLocalDate(tournamentStartDate) : ''}
                                        max={tournamentEndDate ? utcToLocalDate(tournamentEndDate) : ''}
                                        onChange={(e) => {
                                            const dateValue = e.target.value;
                                            const utcValue = dateValue ? dateInputToUTCEndOfDay(dateValue) : '';
                                            updateRoundConfig(roundIndex, 'deadline', utcValue);
                                        }}
                                        className="bg-[#0a0a0c] border-white/10 text-white rounded-xl focus:border-esports-accent focus:ring-esports-accent/20"
                                    />
                                    <p className="text-xs text-gray-500">
                                        Teams have until the end of this day to complete their match
                                    </p>
                                    {!isValidDate(config?.deadline || defaultDeadline) && (
                                        <p className="text-xs text-red-400 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Date must be within tournament window
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label className="text-gray-400 text-sm">
                                        {stageFormat === 'swiss' ? 'Round Start Time' : 'Match Start Time'}
                                        <span className="ml-1 text-esports-accent/60">({getTimezoneAbbr()})</span>
                                    </Label>
                                    <Input
                                        type="datetime-local"
                                        value={config?.startTime ? utcToLocalInput(config.startTime) : ''}
                                        min={tournamentStartDate ? utcToLocalInput(tournamentStartDate) : ''}
                                        max={tournamentEndDate ? utcToLocalInput(tournamentEndDate) : ''}
                                        onChange={(e) => updateRoundConfig(roundIndex, 'startTime', e.target.value ? localInputToUTC(e.target.value) : '')}
                                        className="bg-[#0a0a0c] border-white/10 text-white rounded-xl focus:border-esports-accent focus:ring-esports-accent/20"
                                    />
                                    <p className="text-xs text-gray-500">
                                        {stageFormat === 'swiss'
                                            ? `All ${roundMatches.length} matches in this round start together`
                                            : stageFormat === 'round_robin'
                                                ? `All matchday ${roundIndex + 1} games start at this time`
                                                : `All ${roundMatches.length} matches will start at this time`
                                        }
                                    </p>
                                    {config?.startTime && !isValidDate(config.startTime) && (
                                        <p className="text-xs text-red-400 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Date must be within tournament window
                                        </p>
                                    )}
                                </div>
                            )}
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
                        <div className="p-2 bg-esports-accent/20 rounded-xl">
                            <Calendar className="w-5 h-5 text-esports-accent" />
                        </div>
                        Round Scheduling
                    </CardTitle>
                    <Badge className="bg-esports-purple/20 text-esports-purple border-esports-purple/30">
                        <GitBranch className="w-3 h-3 mr-1" />
                        {formatLabel}
                    </Badge>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                    {formatDescriptions[stageFormat] || formatDescriptions.single_elimination}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-esports-accent/70">
                    <Globe className="w-3 h-3" />
                    <span>All times shown in your local timezone ({getTimezoneAbbr()})</span>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
                {/* Tournament Date Info */}
                {(tournamentStartDate || tournamentEndDate) && (
                    <div className="flex items-center gap-3 p-4 bg-esports-accent/5 border border-esports-accent/20 rounded-2xl">
                        <Clock className="w-5 h-5 text-esports-accent" />
                        <div className="text-sm">
                            <span className="text-gray-400">Tournament Window: </span>
                            <span className="text-white font-medium">
                                {tournamentStartDate && format(parseISO(tournamentStartDate), 'MMM d')}
                                {' — '}
                                {tournamentEndDate && format(parseISO(tournamentEndDate), 'MMM d, yyyy')}
                            </span>
                        </div>
                    </div>
                )}

                {/* Self-Play Mode Indicator */}
                {selfPlayEnabled && (
                    <div className="flex items-center gap-3 p-4 bg-esports-purple/10 border border-esports-purple/20 rounded-2xl">
                        <Zap className="w-5 h-5 text-esports-purple" />
                        <div className="text-sm text-esports-purple">
                            <span className="font-medium">Self-Play Mode Active</span>
                            <span className="text-gray-400 ml-2">— Set deadlines, teams schedule their matches</span>
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
                                        <span className="text-lg">{section.icon}</span>
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
                                            const configKey = `${section.key}_${roundIndex}`;
                                            const config = roundConfigs.get(roundIndex);
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
                                                section.key
                                            );
                                        })}
                                </div>
                            ))
                        ) : (
                            /* All other formats: flat round list */
                            Array.from(matchesByRound.entries())
                                .sort(([a], [b]) => a - b)
                                .map(([roundIndex, roundMatches]) => {
                                    const config = roundConfigs.get(roundIndex);
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
                                        null
                                    );
                                })
                        )}
                    </div>
                </ScrollArea>

                {/* No Matches Warning */}
                {matchesByRound.size === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <p className="text-sm text-amber-400">
                            No matches found. Generate the bracket first.
                        </p>
                    </div>
                )}

                {/* Apply Button */}
                <Button
                    onClick={handleApplySchedule}
                    disabled={saving || matchesByRound.size === 0}
                    className="w-full h-14 bg-gradient-to-r from-esports-accent to-esports-blue hover:opacity-90 text-white font-semibold rounded-2xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                    {saving ? (
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Applying Schedule...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            Apply Schedule to All Rounds
                        </div>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};

export default RoundSchedulingPanel;
