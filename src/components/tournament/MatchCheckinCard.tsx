import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import {
  checkinWindowStartMs,
  normalizeScheduledTime,
  parseScheduledTimeMs,
} from '@/utils/scheduledTime';
import {
  getCheckinForfeitDisplay,
  type ForfeitReason,
  type MatchOutcome,
} from '@/utils/matchForfeitDisplay';

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
    matchOutcome?: MatchOutcome;
    forfeitReason?: ForfeitReason;
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
    matchOutcome = null,
    forfeitReason = null,
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
    } = useMatchCheckin(matchId, team1Id, team2Id, {
        subscribeRealtime,
        scheduledTime,
        checkInWindowMinutes,
        userTeamId,
        matchOutcome,
        forfeitReason,
    });
    const { toast } = useToast();
    const [partyCode, setPartyCode] = useState<string | null>(initialPartyCode);
    const [clockTick, setClockTick] = useState(0);

    const scheduledTimeIso = useMemo(
        () => normalizeScheduledTime(scheduledTime),
        [scheduledTime],
    );

    const checkinOpensAtMs = useMemo(
        () => (scheduledTimeIso ? checkinWindowStartMs(scheduledTimeIso, checkInWindowMinutes) : null),
        [scheduledTimeIso, checkInWindowMinutes],
    );

    const matchStartsAtMs = useMemo(
        () => (scheduledTimeIso ? parseScheduledTimeMs(scheduledTimeIso) : null),
        [scheduledTimeIso],
    );

    const handleWindowTransition = useCallback(() => {
        setClockTick((t) => t + 1);
    }, []);

    useEffect(() => {
        if (initialPartyCode) {
            setPartyCode(initialPartyCode);
        }
    }, [initialPartyCode]);

    // Re-evaluate local window boundaries as time advances.
    useEffect(() => {
        if (!scheduledTimeIso || checkinStatus.bothCheckedIn) return;
        const id = window.setInterval(() => setClockTick((t) => t + 1), 1000);
        return () => window.clearInterval(id);
    }, [scheduledTimeIso, checkinStatus.bothCheckedIn]);

    const windowOpen = useMemo(() => {
        if (scheduledTimeIso) return isCheckinWindowOpen(scheduledTimeIso, checkInWindowMinutes);
        return Boolean(checkinWindowOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional tick dependency
    }, [scheduledTimeIso, checkInWindowMinutes, checkinWindowOpen, clockTick, isCheckinWindowOpen]);

    const windowClosed = useMemo(() => {
        if (scheduledTimeIso) return isCheckinWindowClosed(scheduledTimeIso, checkInWindowMinutes);
        return Boolean(checkinWindowClosed);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional tick dependency
    }, [scheduledTimeIso, checkInWindowMinutes, checkinWindowClosed, clockTick, isCheckinWindowClosed]);

    const isTeam1 = competitorIdsMatch(userTeamId, team1Id);
    const myTeamCheckedIn = isTeam1 ? checkinStatus.team1CheckedIn : checkinStatus.team2CheckedIn;

    const forfeitDisplay = getCheckinForfeitDisplay({
        matchOutcome,
        forfeitReason,
        userTeamId,
        team1Id,
        team2Id,
    });

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
                        {scheduledTimeIso && (
                            <span className="text-sm text-zinc-400">
                                {format(new Date(scheduledTimeIso), 'MMM d, h:mm a')} {getTimezoneAbbr()}
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
                        {!windowOpen && !windowClosed && checkinOpensAtMs != null && (
                            <div className="text-center p-4 bg-zinc-800/30 rounded-lg border border-zinc-800/30">
                                <Clock className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                                <p className="text-zinc-400 text-sm mb-1">Check-in opens in</p>
                                <div className="text-xl font-mono text-cyan-400">
                                    <Countdown
                                        targetDate={checkinOpensAtMs}
                                        onComplete={handleWindowTransition}
                                    />
                                </div>
                            </div>
                        )}

                        {windowOpen && !windowClosed && !checkinStatus.bothCheckedIn && matchStartsAtMs != null && (
                            <div className="text-center p-4 bg-zinc-800/40 rounded-lg border border-zinc-800/50 mb-4">
                                <p className="text-zinc-400 text-xs mb-1 uppercase tracking-wider">Check-in closes in</p>
                                <div className="text-2xl font-mono font-bold text-white">
                                    <Countdown
                                        targetDate={matchStartsAtMs}
                                        className="text-emerald-400"
                                        onComplete={handleWindowTransition}
                                    />
                                </div>
                            </div>
                        )}

                        {forfeitDisplay && (
                            <div
                                className={`text-center p-4 rounded-lg mb-4 border ${
                                    forfeitDisplay.tone === 'walkover_win'
                                        ? 'bg-emerald-500/10 border-emerald-500/20'
                                        : 'bg-red-500/10 border-red-500/20'
                                }`}
                            >
                                <p
                                    className={`font-bold ${
                                        forfeitDisplay.tone === 'walkover_win'
                                            ? 'text-emerald-400'
                                            : 'text-red-400'
                                    }`}
                                >
                                    {forfeitDisplay.title}
                                </p>
                                <p className="text-zinc-400 text-xs mt-1">{forfeitDisplay.description}</p>
                            </div>
                        )}

                        {windowClosed && !checkinStatus.bothCheckedIn && !forfeitDisplay && (
                            <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                                <p className="text-red-400 font-bold">Check-in Closed</p>
                                <p className="text-zinc-400 text-xs mt-1">
                                    Check-in window has closed. A walkover will be awarded automatically.
                                </p>
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
                                    <button type="button" size="sm" onClick={copyCode}>
                                        <Copy className="w-4 h-4" />
                                    </button>
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
                                {windowOpen && !windowClosed && !myTeamCheckedIn && !forfeitDisplay && (
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
