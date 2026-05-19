import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Check, X, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { useTimeProposal } from '@/hooks/useTimeProposal';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { getTimezoneAbbr, localInputToUTC, utcToLocalDate } from '@/lib/timeUtils';
import { Countdown } from '@/components/ui/Countdown';

interface TimeProposalCardProps {
    matchId: string;
    roundDeadline: string | null;
    team1Name: string;
    team2Name: string;
    userTeamId: string | undefined;
    team1Id: string | undefined;
    isCaptain: boolean;
    onTimeAccepted?: () => void;
}

const TimeProposalCard: React.FC<TimeProposalCardProps> = ({
    matchId,
    roundDeadline,
    team1Name,
    team2Name,
    userTeamId,
    team1Id,
    isCaptain,
    onTimeAccepted,
}) => {
    const { user } = useAuth();
    const { activeProposal, acceptedProposal, proposeTime, acceptProposal, rejectProposal, counterProposal, isLoading } = useTimeProposal(matchId);

    const [showPicker, setShowPicker] = useState(false);
    const [proposedDate, setProposedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [proposedTime, setProposedTime] = useState<string>('20:00');
    const [showCounter, setShowCounter] = useState(false);

    console.log('[TimeProposalCard] Match:', matchId, 'Deadline:', roundDeadline);

    const isMyProposal = activeProposal?.proposed_by === user?.id;
    const isTeam1 = userTeamId === team1Id;

    const handlePropose = async () => {
        // Convert local date+time to a Date object (interpreted as local time)
        const dateTime = new Date(`${proposedDate}T${proposedTime}`);
        await proposeTime.mutateAsync(dateTime);
        setShowPicker(false);
    };

    const handleAccept = async () => {
        if (activeProposal) {
            await acceptProposal.mutateAsync(activeProposal.id);
            onTimeAccepted?.();
        }
    };

    const handleReject = async () => {
        if (activeProposal) {
            await rejectProposal.mutateAsync(activeProposal.id);
        }
    };

    const handleCounter = async () => {
        if (activeProposal) {
            const dateTime = new Date(`${proposedDate}T${proposedTime}`);
            await counterProposal.mutateAsync({ proposalId: activeProposal.id, newTime: dateTime });
            setShowCounter(false);
        }
    };

    // If time is already accepted, show the scheduled time
    if (acceptedProposal) {
        return (
            <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
                <CardContent className="p-0">
                    <div className="bg-rose-500/5 p-4 border-b border-white/10">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-400" />
                            Match Scheduled
                        </h3>
                    </div>
                    <div className="p-4">
                        <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <Calendar className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-white">
                                {format(new Date(acceptedProposal.proposed_time), 'EEEE, MMM d')}
                            </p>
                            <p className="text-xl text-emerald-400 font-mono mb-4">
                                {format(new Date(acceptedProposal.proposed_time), 'h:mm a')} {getTimezoneAbbr()}
                            </p>

                            {/* Countdown Timer */}
                            <div className="pt-4 border-t border-emerald-500/10">
                                {(() => {
                                    const now = new Date();
                                    const scheduled = new Date(acceptedProposal.proposed_time);
                                    const windowMinutes = 15; // Default check-in window
                                    const windowStart = new Date(scheduled.getTime() - windowMinutes * 60 * 1000);

                                    if (now < windowStart) {
                                        return (
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Check-in opens in</p>
                                                <div className="text-2xl font-mono font-bold text-cyan-400">
                                                    <Countdown targetDate={windowStart} />
                                                </div>
                                            </div>
                                        );
                                    } else if (now < scheduled) {
                                        return (
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-center gap-2 mb-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-black">Check-in is Live</p>
                                                </div>
                                                <div className="text-2xl font-mono font-bold text-white">
                                                    <Countdown targetDate={scheduled} />
                                                </div>
                                                <p className="text-[9px] text-zinc-500 italic mt-1 font-medium">Time remaining to check-in</p>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div className="flex items-center justify-center gap-2 text-red-500">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-xs font-black uppercase tracking-widest">Match Time Passed</span>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
            <CardContent className="p-0">
                {/* Header */}
                <div className="bg-rose-500/10 p-4 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-rose-400" />
                            Schedule Match
                        </h3>
                        {/* DEBUG DEADLINE */}
                        <div className="flex flex-col items-end">
                            {roundDeadline ? (
                                <>
                                    <span className="text-xs text-zinc-400">Deadline: {format(new Date(roundDeadline), 'MMM d')} (End of Day)</span>
                                    <span className="text-[10px] text-zinc-600 font-mono hidden">Raw: {roundDeadline}</span>
                                </>
                            ) : (
                                <span className="text-xs text-red-500">No Deadline Set</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* No active proposal - show propose button */}
                    {!activeProposal && !showPicker && isCaptain && (
                        <Button
                            onClick={() => setShowPicker(true)}
                            className="w-full bg-rose-500 hover:bg-rose-600 transition-all text-white font-semibold"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Propose Match Time
                        </Button>
                    )}

                    {/* Time picker */}
                    {showPicker && (
                        <div className="space-y-4 p-4 bg-zinc-800/50 rounded-lg">
                            {/* Deadline warning */}
                            {roundDeadline && (
                                <div className="text-xs text-amber-400 flex items-center gap-1 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                    <AlertCircle className="w-3 h-3" />
                                    Must be before end of: {format(new Date(roundDeadline), 'MMM d')}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-zinc-400">Date <span className="text-zinc-600">({getTimezoneAbbr()})</span></label>
                                    <Input
                                        type="date"
                                        value={proposedDate}
                                        min={format(new Date(), 'yyyy-MM-dd')}
                                        max={roundDeadline ? utcToLocalDate(roundDeadline) : undefined}
                                        onChange={(e) => setProposedDate(e.target.value)}
                                        className="bg-zinc-900 border-zinc-700 text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-zinc-400">Time</label>
                                    <Input
                                        type="time"
                                        value={proposedTime}
                                        onChange={(e) => setProposedTime(e.target.value)}
                                        className="bg-zinc-900 border-zinc-700 text-white"
                                    />
                                </div>
                            </div>
                            {/* Validation check */}
                            {roundDeadline && proposedDate && proposedTime && (
                                (() => {
                                    const proposedDateTime = new Date(`${proposedDate}T${proposedTime}`);
                                    const deadlineDate = new Date(roundDeadline);
                                    if (proposedDateTime > deadlineDate) {
                                        return (
                                            <p className="text-xs text-red-400 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                Proposed time exceeds round deadline
                                            </p>
                                        );
                                    }
                                    return null;
                                })()
                            )}
                            <div className="flex gap-2">
                                <Button
                                    onClick={handlePropose}
                                    disabled={proposeTime.isPending || (roundDeadline && new Date(`${proposedDate}T${proposedTime}`) > new Date(roundDeadline))}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    {proposeTime.isPending ? 'Sending...' : 'Send Proposal'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowPicker(false)}
                                    className="border-zinc-700"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Active proposal - show status */}
                    {activeProposal && (
                        <div className="space-y-4">
                            {/* Proposal details */}
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-blue-400 uppercase tracking-wider">
                                        {isMyProposal ? 'Your Proposal' : 'Opponent Proposed'}
                                    </span>
                                    <span className="text-xs text-zinc-500">
                                        {format(new Date(activeProposal.created_at), 'MMM d, h:mm a')} {getTimezoneAbbr()}
                                    </span>
                                </div>
                                <div className="text-center py-2">
                                    <p className="text-xl font-bold text-white">
                                        {format(new Date(activeProposal.proposed_time), 'EEEE, MMM d')}
                                    </p>
                                    <p className="text-lg text-blue-400 font-mono">
                                        {format(new Date(activeProposal.proposed_time), 'h:mm a')} {getTimezoneAbbr()}
                                    </p>
                                </div>
                            </div>

                            {/* My proposal - waiting */}
                            {isMyProposal && (
                                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                                    <Clock className="w-5 h-5 text-zinc-400 mx-auto mb-1 animate-pulse" />
                                    <p className="text-zinc-400 text-sm">Waiting for opponent to respond...</p>
                                </div>
                            )}

                            {/* Opponent's proposal - show actions */}
                            {!isMyProposal && isCaptain && (
                                <div className="space-y-2">
                                    <Button
                                        onClick={handleAccept}
                                        disabled={acceptProposal.isPending}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        Accept Time
                                    </Button>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            onClick={() => setShowCounter(true)}
                                            variant="outline"
                                            className="border-zinc-700 hover:bg-zinc-800"
                                        >
                                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                                            Counter
                                        </Button>
                                        <Button
                                            onClick={handleReject}
                                            disabled={rejectProposal.isPending}
                                            variant="outline"
                                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            Decline
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Counter proposal picker */}
                            {showCounter && (
                                <div className="space-y-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                                    <p className="text-sm text-zinc-400">Propose a different time:</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            type="date"
                                            value={proposedDate}
                                            min={format(new Date(), 'yyyy-MM-dd')}
                                            max={roundDeadline ? utcToLocalDate(roundDeadline) : undefined}
                                            onChange={(e) => setProposedDate(e.target.value)}
                                            className="bg-zinc-900 border-zinc-700 text-white"
                                        />
                                        <Input
                                            type="time"
                                            value={proposedTime}
                                            onChange={(e) => setProposedTime(e.target.value)}
                                            className="bg-zinc-900 border-zinc-700 text-white"
                                        />
                                    </div>
                                    {/* Validation for Counter */}
                                    {roundDeadline && proposedDate && proposedTime && (
                                        (() => {
                                            const proposedDateTime = new Date(`${proposedDate}T${proposedTime}`);
                                            const deadlineDate = new Date(roundDeadline);
                                            if (proposedDateTime > deadlineDate) {
                                                return (
                                                    <p className="text-xs text-red-400 flex items-center gap-1 mt-2">
                                                        <AlertCircle className="w-3 h-3" />
                                                        Exceeds deadline
                                                    </p>
                                                );
                                            }
                                            return null;
                                        })()
                                    )}
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleCounter}
                                            disabled={counterProposal.isPending || (roundDeadline && new Date(`${proposedDate}T${proposedTime}`) > new Date(roundDeadline))}
                                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                                        >
                                            Send Counter
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowCounter(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Not a captain warning */}
                    {!isCaptain && (
                        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <p className="text-sm text-amber-400">
                                Only team captains can schedule matches.
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default TimeProposalCard;
