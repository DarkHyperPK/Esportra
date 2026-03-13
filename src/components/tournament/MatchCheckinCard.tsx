import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Clock, User, Zap, Copy } from 'lucide-react';
import { useMatchCheckin } from '@/hooks/useMatchCheckin';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns';
import { getTimezoneAbbr } from '@/lib/timeUtils';
import { Countdown } from '@/components/ui/Countdown';

interface MatchCheckinCardProps {
    matchId: string;
    team1Id: string | undefined;
    team2Id: string | undefined;
    team1Name: string;
    team2Name: string;
    userTeamId: string | undefined;
    scheduledTime: string | null;
    isCaptain: boolean;
    selfPlayEnabled: boolean;
    checkInWindowMinutes?: number;
    onPartyCodeGenerated?: (code: string) => void;
}

const MatchCheckinCard: React.FC<MatchCheckinCardProps> = ({
    matchId,
    team1Id,
    team2Id,
    team1Name,
    team2Name,
    userTeamId,
    scheduledTime,
    isCaptain,
    selfPlayEnabled,
    checkInWindowMinutes = 15, // Default to 15 if not provided
    onPartyCodeGenerated,
}) => {
    const {
        checkinStatus,
        checkIn,
        isCheckinWindowOpen,
        isCheckinWindowClosed,
        getTimeUntilCheckinOpens,
        getTimeUntilWindowCloses
    } = useMatchCheckin(matchId, team1Id, team2Id);
    const { toast } = useToast();
    const [manualCode, setManualCode] = useState('');
    const [isSubmittingCode, setIsSubmittingCode] = useState(false);
    const [partyCode, setPartyCode] = useState<string | null>(null);

    const windowOpen = scheduledTime ? isCheckinWindowOpen(scheduledTime, checkInWindowMinutes) : false;
    const windowClosed = scheduledTime ? isCheckinWindowClosed(scheduledTime, checkInWindowMinutes) : false;
    const timeUntilOpen = scheduledTime ? getTimeUntilCheckinOpens(scheduledTime, checkInWindowMinutes) : null;
    const timeUntilClosed = scheduledTime ? getTimeUntilWindowCloses(scheduledTime, checkInWindowMinutes) : null;

    const isTeam1 = userTeamId === team1Id;
    const myTeamCheckedIn = isTeam1 ? checkinStatus.team1CheckedIn : checkinStatus.team2CheckedIn;

    // Submit manual party code (Team 1 only in self-play)
    const submitPartyCode = async () => {
        if (!manualCode.trim()) return;
        setIsSubmittingCode(true);
        try {
            const code = manualCode.trim().toUpperCase();

            await apiClient.post(`/api/matches/${matchId}/go-live`, { partyCode: code });

            setPartyCode(code);
            onPartyCodeGenerated?.(code);
            toast({ title: 'Match Started', description: `Party Code: ${code}` });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmittingCode(false);
        }
    };

    const copyCode = () => {
        if (partyCode) {
            navigator.clipboard.writeText(partyCode);
            toast({ title: 'Copied!', description: 'Party code copied to clipboard' });
        }
    };

    const handleCheckIn = () => {
        if (!userTeamId) return;
        checkIn.mutate(userTeamId);
    };

    // Format time until check-in opens
    const formatTimeRemaining = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
            <CardContent className="p-0">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 p-4 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <Zap className="w-4 h-4 text-emerald-400" />
                            Match Check-in
                        </h3>
                        {scheduledTime && (
                            <span className="text-sm text-zinc-400">
                                {format(new Date(scheduledTime), 'MMM d, h:mm a')} {getTimezoneAbbr()}
                            </span>
                        )}
                    </div>
                </div>

                {/* Check-in Status */}
                <div className="p-4 space-y-4">
                    {/* Team 1 Status */}
                    <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${checkinStatus.team1CheckedIn ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                            <span className="text-white font-medium">{team1Name}</span>
                        </div>
                        {checkinStatus.team1CheckedIn ? (
                            <span className="text-emerald-400 text-sm flex items-center gap-1">
                                <Check className="w-4 h-4" /> Ready
                            </span>
                        ) : (
                            <span className="text-zinc-500 text-sm">Waiting...</span>
                        )}
                    </div>

                    {/* Team 2 Status */}
                    <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${checkinStatus.team2CheckedIn ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                            <span className="text-white font-medium">{team2Name}</span>
                        </div>
                        {checkinStatus.team2CheckedIn ? (
                            <span className="text-emerald-400 text-sm flex items-center gap-1">
                                <Check className="w-4 h-4" /> Ready
                            </span>
                        ) : (
                            <span className="text-zinc-500 text-sm">Waiting...</span>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {/* Timer & Status Indicators (Visible to everyone) */}
                    <div className="pt-2">
                        {/* 1. Check-in window not open yet */}
                        {!windowOpen && !windowClosed && scheduledTime && (
                            <div className="text-center p-4 bg-zinc-800/30 rounded-lg border border-zinc-800/30">
                                <Clock className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                                <p className="text-zinc-400 text-sm mb-1">Check-in opens in</p>
                                <div className="text-xl font-mono text-cyan-400">
                                    <Countdown
                                        targetDate={new Date(new Date(scheduledTime).getTime() - (checkInWindowMinutes * 60 * 1000))}
                                    />
                                </div>
                            </div>
                        )}

                        {/* 2. Check-in window open - show countdown to match start */}
                        {windowOpen && !checkinStatus.bothCheckedIn && (
                            <div className="text-center p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg mb-4">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-emerald-400 text-sm font-medium">Check-in is LIVE</p>
                                </div>
                                <p className="text-zinc-400 text-xs mb-1 uppercase tracking-wider">Time remaining to check-in:</p>
                                <div className="text-2xl font-mono font-bold text-white">
                                    <Countdown
                                        targetDate={new Date(scheduledTime)}
                                        className="text-emerald-400"
                                    />
                                </div>
                            </div>
                        )}

                        {/* 3. Check-in window closed - Late State */}
                        {windowClosed && !checkinStatus.bothCheckedIn && (
                            <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                                <Clock className="w-6 h-6 text-red-500 mx-auto mb-2" />
                                <p className="text-red-400 font-bold">Check-in Closed</p>
                                <p className="text-zinc-400 text-xs mt-1">Match time has passed. Admins will review for forfeit.</p>
                            </div>
                        )}

                        {/* 4. Ready Status (Already checked in, waiting for opponent) */}
                        {myTeamCheckedIn && !checkinStatus.bothCheckedIn && (
                            <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-4">
                                <Check className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                                <p className="text-emerald-400 font-medium">You're checked in!</p>
                                <p className="text-zinc-400 text-sm mt-1">Waiting for opponent...</p>
                            </div>
                        )}

                        {/* 5. Show party code (Visible to everyone if match started) */}
                        {partyCode && (
                            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg mb-4">
                                <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Party Code</p>
                                <div className="flex items-center justify-between">
                                    <code className="text-2xl font-mono font-bold text-purple-400 tracking-wider">{partyCode}</code>
                                    <Button size="sm" variant="ghost" onClick={copyCode} className="hover:bg-purple-500/10">
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* 6. Both Checked In (Waiting for code) */}
                        {checkinStatus.bothCheckedIn && selfPlayEnabled && !partyCode && (
                            <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg mb-4">
                                <Zap className="w-6 h-6 text-purple-400 mx-auto mb-2 animate-pulse" />
                                <p className="text-purple-300 font-medium">Both teams ready!</p>
                                <p className="text-zinc-400 text-sm mt-1">
                                    {isTeam1 ? 'Please create the lobby and enter the code below.' : 'Waiting for the opponent to provide the party code...'}
                                </p>
                            </div>
                        )}

                        {/* Captain-only Actions */}
                        {isCaptain && (
                            <div className="space-y-4">
                                {/* Check-in button */}
                                {windowOpen && !myTeamCheckedIn && (
                                    <Button
                                        onClick={handleCheckIn}
                                        disabled={checkIn.isPending}
                                        className="w-full h-12 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-lg font-semibold shadow-lg shadow-emerald-500/20"
                                    >
                                        {checkIn.isPending ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5 mr-2" />
                                                Check In Now
                                            </>
                                        )}
                                    </Button>
                                )}

                                {/* Both checked in - show manual party code input (Team 1 only in self-play) */}
                                {checkinStatus.bothCheckedIn && selfPlayEnabled && isTeam1 && !partyCode && (
                                    <div className="space-y-3 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                                            <Zap className="w-4 h-4 text-purple-500" />
                                            <span>Create the lobby in-game and enter code:</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                value={manualCode}
                                                onChange={(e) => setManualCode(e.target.value)}
                                                placeholder="Lobby Code"
                                                className="bg-zinc-900 border-zinc-700 text-white font-mono uppercase"
                                            />
                                            <Button
                                                onClick={submitPartyCode}
                                                disabled={isSubmittingCode || !manualCode.trim()}
                                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6"
                                            >
                                                {isSubmittingCode ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    'Start'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default MatchCheckinCard;
