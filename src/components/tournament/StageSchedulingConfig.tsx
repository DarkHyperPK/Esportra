import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Zap, MessageCircle, CheckCircle, Users, GitBranch } from 'lucide-react';
import { useMatchScheduling } from '@/hooks/useMatchScheduling';
import { getTimezoneAbbr } from '@/lib/timeUtils';

interface StageSchedulingConfigProps {
    stageId: string;
    stageFormat: string; // single_elimination, double_elimination, swiss, round_robin
    onConfigChange?: (config: any) => void;
}

// Format-specific info
const formatInfo: Record<string, { label: string; icon: string; description: string; roundsNote: string }> = {
    single_elimination: {
        label: 'Single Elimination',
        icon: '🏆',
        description: 'One loss and you\'re out. Quick format, clear progression.',
        roundsNote: 'Rounds halve each stage (8 teams → 4 → 2 → 1)',
    },
    double_elimination: {
        label: 'Double Elimination',
        icon: '⚔️',
        description: 'Two bracket system - winners and losers. Teams get a second chance.',
        roundsNote: 'Upper bracket + lower bracket rounds run in parallel',
    },
    swiss: {
        label: 'Swiss',
        icon: '🔄',
        description: 'Fixed rounds, teams with similar records play each other.',
        roundsNote: 'All matches in each round happen simultaneously',
    },
    round_robin: {
        label: 'Round Robin',
        icon: '📊',
        description: 'Everyone plays everyone. Most comprehensive but time-intensive.',
        roundsNote: 'Multiple matchdays, each team plays once per round',
    },
};

const StageSchedulingConfig: React.FC<StageSchedulingConfigProps> = ({ stageId, stageFormat, onConfigChange }) => {
    const { schedulingConfig, updateConfig, isLoading } = useMatchScheduling(stageId);
    const formatData = formatInfo[stageFormat] || formatInfo.single_elimination;
    const [optimisticSelfPlay, setOptimisticSelfPlay] = React.useState<boolean | null>(null);
    const isSelfPlayEnabled = optimisticSelfPlay !== null ? optimisticSelfPlay : !!schedulingConfig?.self_play_enabled;

    const handleUpdate = async (key: string, value: any) => {
        if (key === 'self_play_enabled') {
            setOptimisticSelfPlay(value);
        }

        const newConfig = {
            ...schedulingConfig,
            [key]: value,
        };

        try {
            await updateConfig.mutateAsync(newConfig);
            onConfigChange?.(newConfig);
        } catch (error) {
            console.error('[StageSchedulingConfig] Update failed:', error);
            if (key === 'self_play_enabled') {
                setOptimisticSelfPlay(null); // Revert to backend state
            }
        }
    };

    if (isLoading || !schedulingConfig) {
        return (
            <Card className="bg-[#0a0a0c] border-white/5 rounded-3xl">
                <CardContent className="p-8">
                    <div className="animate-shimmer space-y-4">
                        <div className="h-6 bg-white/5 rounded-lg w-1/2"></div>
                        <div className="h-16 bg-white/5 rounded-2xl"></div>
                        <div className="h-16 bg-white/5 rounded-2xl"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-[#0a0a0c] border-white/5 rounded-3xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-white/5">
                <CardTitle className="flex items-center gap-3 text-white font-heading text-xl">
                    <div className="p-2 bg-esports-purple/20 rounded-xl">
                        <Zap className="w-5 h-5 text-esports-purple" />
                    </div>
                    Match Settings
                </CardTitle>
                <p className="text-sm text-gray-400 mt-2">
                    Configure how teams schedule and start their matches.
                </p>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
                {/* Format Badge */}
                <div className="flex items-center gap-3 p-4 bg-[#111111] rounded-2xl border border-white/5">
                    <div className="p-2 bg-esports-accent/10 rounded-xl">
                        <GitBranch className="w-5 h-5 text-esports-accent" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{formatData.icon}</span>
                            <span className="text-white font-medium">{formatData.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{formatData.description}</p>
                    </div>
                </div>

                {/* Self-Play Toggle */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-5 bg-[#111111] rounded-2xl border border-white/5 hover:border-esports-purple/30 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-esports-purple/10 rounded-xl">
                            <Zap className="w-6 h-6 text-esports-purple" />
                        </div>
                        <div>
                            <Label className="text-white font-medium text-base">Self-Play Mode</Label>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Teams coordinate & start matches themselves
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={isSelfPlayEnabled}
                        onCheckedChange={(checked) => handleUpdate('self_play_enabled', checked)}
                        className="data-[state=checked]:bg-esports-purple"
                    />
                </motion.div>

                {/* Check-in Window (always enabled, tournament check-in is mandatory) */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="p-5 bg-[#111111] rounded-2xl border border-white/5"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <Label className="text-white font-medium text-base">Match Check-in</Label>
                                <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">Required</Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Teams must check in before their match starts
                            </p>
                        </div>
                    </div>
                    <div className="ml-16">
                        <Label className="text-gray-400 text-sm">Check-in Window</Label>
                        <div className="flex items-center gap-3 mt-2">
                            <Input
                                type="number"
                                min={5}
                                max={60}
                                value={schedulingConfig.checkin_window_minutes || 15}
                                onChange={(e) => handleUpdate('checkin_window_minutes', parseInt(e.target.value) || 15)}
                                className="w-24 bg-[#0a0a0c] border-white/10 text-white text-center rounded-xl focus:border-emerald-500"
                            />
                            <span className="text-gray-500 text-sm">minutes before match time</span>
                        </div>
                    </div>
                </motion.div>

                {/* Daily Start Time Preset (Swiss & Round Robin only) */}
                {(stageFormat === 'swiss' || stageFormat === 'round_robin') && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-5 bg-[#111111] rounded-2xl border border-white/5"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-cyan-500/10 rounded-xl">
                                <Calendar className="w-6 h-6 text-cyan-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Label className="text-white font-medium text-base">Daily Start Time</Label>
                                    <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">1 Round = 1 Day</Badge>
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Default time each day's matches begin (auto-applied to new rounds)
                                </p>
                            </div>
                        </div>
                        <div className="ml-16">
                            <Label className="text-gray-400 text-sm">
                                Start Time <span className="text-gray-600">({getTimezoneAbbr()})</span>
                            </Label>
                            <div className="flex items-center gap-3 mt-2">
                                <Input
                                    type="time"
                                    value={schedulingConfig.daily_start_time || '20:00'}
                                    onChange={(e) => handleUpdate('daily_start_time', e.target.value)}
                                    className="w-32 bg-[#0a0a0c] border-white/10 text-white text-center rounded-xl focus:border-cyan-500"
                                />
                                <span className="text-gray-500 text-sm">every day</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                                Each round will auto-schedule to the next day at this time when generated.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Self-Play Mode Info */}
                {isSelfPlayEnabled && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 bg-esports-purple/5 border border-esports-purple/20 rounded-2xl"
                    >
                        <h4 className="text-sm font-medium text-esports-purple flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4" />
                            How Self-Play Works
                        </h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-start gap-2">
                                <span className="text-esports-purple font-bold">1.</span>
                                Set deadline for each round (1 round per day recommended)
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-esports-purple font-bold">2.</span>
                                Teams chat and propose match times within deadline
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-esports-purple font-bold">3.</span>
                                Both teams check in when ready
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-esports-purple font-bold">4.</span>
                                Team 1 generates party code to start match
                            </li>
                        </ul>
                    </motion.div>
                )}

                {/* Organizer-Controlled Info */}
                {!isSelfPlayEnabled && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 bg-esports-accent/5 border border-esports-accent/20 rounded-2xl"
                    >
                        <h4 className="text-sm font-medium text-esports-accent flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4" />
                            Organizer-Controlled Mode
                        </h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-start gap-2">
                                <span className="text-esports-accent font-bold">1.</span>
                                Set specific start times for each round
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-esports-accent font-bold">2.</span>
                                {formatData.roundsNote}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-esports-accent font-bold">3.</span>
                                Teams check in and wait for organizer to provide party codes
                            </li>
                        </ul>
                    </motion.div>
                )}

                {/* Info Box */}
                <div className="flex items-start gap-3 p-4 bg-[#111111] rounded-2xl border border-white/5">
                    <MessageCircle className="w-5 h-5 text-gray-500 mt-0.5" />
                    <p className="text-sm text-gray-500">
                        Match chat is always enabled for captains to coordinate and communicate.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default StageSchedulingConfig;
