import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JackButton } from "@/components/ui/JackButton";
import { Check, Clock, Copy } from 'lucide-react';
import { useMatchCheckin } from '@/hooks/useMatchCheckin';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getTimezoneAbbr } from '@/lib/timeUtils';
import { Countdown } from '@/components/ui/Countdown';
import { competitorIdsMatch } from '@/utils/competitorId';
import PartyCodeGoLiveCard from '@/components/tournament/PartyCodeGoLiveCard';

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
    checkinWindowOpen?: boolean;
    checkinWindowClosed?: boolean;
    hidePartyCodeInput?: boolean;
    initialPartyCode?: string | null;
    onPartyCodeGenerated?: (code: string) => void;
    /** When false, parent page handles MatchHub realtime (avoids duplicate JoinMatch). */
    subscribeRealtime?: boolean;
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
    checkInWindowMinutes = 15,
    checkinWindowOpen,
    checkinWindowClosed,
    hidePartyCodeInput = false,
    initialPartyCode = null,
    onPartyCodeGenerated,
    subscribeRealtime = true,
}) => {
    const {
        checkinStatus,
        checkIn,
        isCheckinWindowOpen,
        isCheckinWindowClosed,
    } = useMatchCheckin(matchId, team1Id, team2Id, { subscribeRealtime });
    const { toast } = useToast();
    const [partyCode, setPartyCode] = useState<string | null>(initialPartyCode);
    const [clockTick, setClockTick] = useState(0);

    useEffect(() => {
        if (initialPartyCode) {
            setPartyCode(initialPartyCode);
        }
    }, [initialPartyCode]);

    // Re-evaluate local window boundaries as time advances.
    useEffect(() => {
        if (!scheduledTime || checkinStatus.bothCheckedIn) return;
        const id = window.setInterval(() => setClockTick((t) => t + 1), 1000);
        return () => window.clearInterval(id);
    }, [scheduledTime, checkinStatus.bothCheckedIn]);

    const windowOpen = useMemo(() => {
        const localOpen = scheduledTime
            ? isCheckinWindowOpen(scheduledTime, checkInWindowMinutes)
            : false;
        const localClosed = scheduledTime
            ? isCheckinWindowClosed(scheduledTime, checkInWindowMinutes)
            : false;
        if (localClosed) return false;
        return checkinWindowOpen ?? localOpen;
    // clockTick drives recompute when relying on local schedule math
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional tick dependency
    }, [scheduledTime, checkInWindowMinutes, checkinWindowOpen, clockTick, isCheckinWindowOpen, isCheckinWindowClosed]);

    const windowClosed = useMemo(() => {
        const localClosed = scheduledTime
            ? isCheckinWindowClosed(scheduledTime, checkInWindowMinutes)
            : false;
        return localClosed || Boolean(checkinWindowClosed);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional tick dependency
    }, [scheduledTime, checkInWindowMinutes, checkinWindowClosed, clockTick, isCheckinWindowClosed]);

    const isTeam1 = competitorIdsMatch(userTeamId, team1Id);
    const myTeamCheckedIn = isTeam1 ? checkinStatus.team1CheckedIn : checkinStatus.team2CheckedIn;

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

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
            <CardContent className="p-0">
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">Match Check-in</h3>
                        {scheduledTime && (
                            <span className="text-sm text-zinc-400">
                                {format(new Date(scheduledTime), 'MMM d, h:mm a')} {getTimezoneAbbr()}
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-4 space-y-4">
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

                    <div className="pt-2">
                        {!windowOpen && !windowClosed && scheduledTime && (
                            <div className="text-center p-4 bg-zinc-800/30 rounded-lg border border-zinc-800/30">
                                <Clock className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                                <p className="text-zinc-400 text-sm mb-1">Check-in opens in</p>
                                <div className="text-xl font-mono text-cyan-400">
                                    <Countdown
                                        targetDate={new Date(new Date(scheduledTime).getTime() - (checkInWindowMinutes * 60 * 1000))}
                                        onComplete={() => setClockTick((t) => t + 1)}
                                    />
                                </div>
                            </div>
                        )}

                        {windowOpen && !checkinStatus.bothCheckedIn && scheduledTime && (
                            <div className="text-center p-4 bg-zinc-800/40 rounded-lg border border-zinc-800/50 mb-4">
                                <p className="text-zinc-400 text-xs mb-1 uppercase tracking-wider">Match starts in</p>
                                <div className="text-2xl font-mono font-bold text-white">
                                    <Countdown
                                        targetDate={new Date(scheduledTime)}
                                        className="text-emerald-400"
                                    />
                                </div>
                            </div>
                        )}

                        {windowClosed && !checkinStatus.bothCheckedIn && (
                            <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                                <p className="text-red-400 font-bold">Check-in Closed</p>
                                <p className="text-zinc-400 text-xs mt-1">Check-in window has closed. A walkover will be awarded automatically.</p>
                            </div>
                        )}

                        {myTeamCheckedIn && !checkinStatus.bothCheckedIn && (
                            <p className="text-sm text-zinc-400 text-center mb-4">You&apos;re checked in. Waiting for opponent.</p>
                        )}

                        {partyCode && (
                            <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg mb-4">
                                <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Party Code</p>
                                <div className="flex items-center justify-between">
                                    <code className="text-2xl font-mono font-bold text-rose-400 tracking-wider">{partyCode}</code>
                                    <Button size="sm" variant="ghost" onClick={copyCode} className="hover:bg-rose-500/10">
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {checkinStatus.bothCheckedIn && selfPlayEnabled && !partyCode && (
                            <p className="text-sm text-zinc-400 text-center mb-4">
                                {isTeam1
                                    ? 'Both teams are ready. Create the lobby and enter the party code below.'
                                    : 'Both teams are ready. Waiting for the opponent to provide the party code.'}
                            </p>
                        )}

                        {isCaptain && (
                            <div className="space-y-4">
                                {windowOpen && !myTeamCheckedIn && (
                                    <JackButton
                                        onClick={handleCheckIn}
                                        disabled={checkIn.isPending}
                                        className="w-full h-12 text-lg"
                                    >
                                        {checkIn.isPending ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5 mr-2" />
                                                Check In Now
                                            </>
                                        )}
                                    </JackButton>
                                )}

                                {!hidePartyCodeInput && checkinStatus.bothCheckedIn && selfPlayEnabled && isTeam1 && isCaptain && !partyCode && (
                                    <PartyCodeGoLiveCard
                                        matchId={matchId}
                                        onSuccess={(code) => {
                                            setPartyCode(code);
                                            onPartyCodeGenerated?.(code);
                                        }}
                                    />
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
