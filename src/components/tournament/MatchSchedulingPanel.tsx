import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Check, AlertCircle } from 'lucide-react';
import { useMatchScheduling } from '@/hooks/useMatchScheduling';
import { format } from 'date-fns';
import { getTimezoneAbbr } from '@/lib/timeUtils';

interface MatchSchedulingPanelProps {
    stageId: string;
    onScheduleApplied?: () => void;
}

const MatchSchedulingPanel: React.FC<MatchSchedulingPanelProps> = ({ stageId, onScheduleApplied }) => {
    const { schedulingConfig, matches, isLoading, applyIntervalSchedule, generateSchedulePreview } = useMatchScheduling(stageId);

    // Default: 75 minutes (1h 15m)
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState<string>('20:00');
    const [intervalHours, setIntervalHours] = useState<number>(1);
    const [intervalMinutes, setIntervalMinutes] = useState<number>(15);
    const [showPreview, setShowPreview] = useState(false);

    const totalIntervalMinutes = intervalHours * 60 + intervalMinutes;

    // Generate preview
    const preview = useMemo(() => {
        if (!showPreview) return [];
        const startDateTime = new Date(`${startDate}T${startTime}`);
        return generateSchedulePreview(startDateTime, totalIntervalMinutes);
    }, [startDate, startTime, totalIntervalMinutes, showPreview, generateSchedulePreview]);

    const handleApplySchedule = async () => {
        const startDateTime = new Date(`${startDate}T${startTime}`);
        await applyIntervalSchedule.mutateAsync({
            startTime: startDateTime,
            intervalMinutes: totalIntervalMinutes,
        });
        onScheduleApplied?.();
    };

    if (isLoading) {
        return (
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-6">
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4">
                            <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
                            <div className="h-4 bg-zinc-700 rounded w-1/2"></div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-white">
                    <Calendar className="w-5 h-5 text-cyan-500" />
                    Round Scheduling
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Start Time */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-zinc-400">Start Date</Label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-zinc-400">Start Time</Label>
                        <Input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                        />
                    </div>
                </div>

                {/* Interval */}
                <div className="space-y-2">
                    <Label className="text-zinc-400">Match Interval</Label>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min={0}
                                max={23}
                                value={intervalHours}
                                onChange={(e) => setIntervalHours(parseInt(e.target.value) || 0)}
                                className="w-20 bg-zinc-800 border-zinc-700 text-white text-center"
                            />
                            <span className="text-zinc-500 text-sm">hours</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min={0}
                                max={59}
                                value={intervalMinutes}
                                onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 0)}
                                className="w-20 bg-zinc-800 border-zinc-700 text-white text-center"
                            />
                            <span className="text-zinc-500 text-sm">minutes</span>
                        </div>
                    </div>
                    <p className="text-xs text-zinc-500">
                        Total: {totalIntervalMinutes} minutes between matches
                    </p>
                </div>

                {/* Preview Toggle */}
                <Button
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="w-full border-zinc-700 hover:bg-zinc-800"
                >
                    <Clock className="w-4 h-4 mr-2" />
                    {showPreview ? 'Hide Preview' : 'Preview Schedule'}
                </Button>

                {/* Schedule Preview */}
                {showPreview && preview.length > 0 && (
                    <div className="bg-zinc-800/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <h4 className="text-sm font-medium text-zinc-400 mb-3">Schedule Preview</h4>
                        <div className="space-y-2">
                            {preview.slice(0, 10).map((item, index) => {
                                const match = matches?.find(m => m.id === item.matchId);
                                return (
                                    <div key={item.matchId} className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-300">
                                            Match {item.matchNumber}
                                        </span>
                                        <span className="text-cyan-400 font-mono">
                                            {format(new Date(item.scheduledTime), 'MMM d, h:mm a')} {getTimezoneAbbr()}
                                        </span>
                                    </div>
                                );
                            })}
                            {preview.length > 10 && (
                                <p className="text-xs text-zinc-500 pt-2">
                                    ... and {preview.length - 10} more matches
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* No Matches Warning */}
                {matches?.length === 0 && (
                    <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <p className="text-sm text-amber-400">
                            No matches found. Generate bracket first.
                        </p>
                    </div>
                )}

                {/* Apply Button */}
                <Button
                    onClick={handleApplySchedule}
                    disabled={applyIntervalSchedule.isPending || !matches?.length}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                >
                    {applyIntervalSchedule.isPending ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Applying...
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4 mr-2" />
                            Apply Schedule to {matches?.length || 0} Matches
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};

export default MatchSchedulingPanel;
