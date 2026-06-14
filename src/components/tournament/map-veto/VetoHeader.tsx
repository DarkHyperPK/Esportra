import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Link2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchMapVeto } from '@/hooks/useMapVetoMachine';
import { useToast } from '@/hooks/use-toast';

interface VetoHeaderProps {
    boText: string;
    vetoStatus: MatchMapVeto['status'];
    effectiveIsOrganizer: boolean;
    handleResetVeto: () => void;
    resetting: boolean;
    vetoId?: string;
    team1LinkToken?: string | null;
    team2LinkToken?: string | null;
    team1Name?: string;
    team2Name?: string;
    showShareLinks?: boolean;
    compact?: boolean;
    getTeamVetoUrl?: (token: string) => string;
}

export const VetoHeader: React.FC<VetoHeaderProps> = ({
    boText,
    vetoStatus,
    effectiveIsOrganizer,
    handleResetVeto,
    resetting,
    vetoId,
    team1LinkToken,
    team2LinkToken,
    team1Name = 'Team 1',
    team2Name = 'Team 2',
    showShareLinks = true,
    compact = false,
    getTeamVetoUrl,
}) => {
    const { toast } = useToast();
    const [copiedTeam, setCopiedTeam] = useState<'team1' | 'team2' | null>(null);

    const copyLink = async (token: string, team: 'team1' | 'team2', teamName: string) => {
        const link = getTeamVetoUrl
            ? getTeamVetoUrl(token)
            : `${window.location.origin}/map-veto/${token}`;
        await navigator.clipboard.writeText(link);
        setCopiedTeam(team);
        toast({ title: 'Copied!', description: `${teamName} veto link copied to clipboard.` });
        setTimeout(() => setCopiedTeam(null), 2000);
    };

    return (
        <div className={cn(
            'flex flex-col gap-3',
            compact ? 'mb-2' : 'mb-4 sm:mb-6',
        )}>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className={cn(
                    'font-black text-white tracking-tighter',
                    compact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl',
                )}>MAP VETO</h1>
                <Badge className="bg-white/10 text-white px-2.5 py-0.5 text-[10px] font-bold border border-white/20 rounded-full">{boText}</Badge>
                {vetoStatus === 'in_progress' && (
                    <Badge className="bg-rose-500/15 text-rose-300 px-2.5 py-0.5 text-[10px] font-bold border border-rose-500/30 rounded-full animate-pulse">
                        LIVE
                    </Badge>
                )}
            </div>

            {effectiveIsOrganizer && (
                <div className="flex flex-wrap items-center gap-2">
                    {showShareLinks && team1LinkToken && (
                        <button type="button"
                            onClick={() => copyLink(team1LinkToken, 'team1', team1Name)}
                            size="sm"
                            className="gap-1.5 px-3 py-1.5 text-xs font-semibold border-white/20 text-white/80 hover:bg-white/10 hover:border-white/30"
                        >
                            {copiedTeam === 'team1' ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                            {team1Name} Link
                        </button>
                    )}
                    {showShareLinks && team2LinkToken && (
                        <button type="button"
                            onClick={() => copyLink(team2LinkToken, 'team2', team2Name)}
                            size="sm"
                            className="gap-1.5 px-3 py-1.5 text-xs font-semibold border-white/15 text-rose-400 hover:bg-rose-500/10 hover:border-white/25"
                        >
                            {copiedTeam === 'team2' ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                            {team2Name} Link
                        </button>
                    )}
                    {vetoId && (
                        <button type="button"
                            onClick={handleResetVeto}
                            disabled={resetting}
                            size="sm"
                            className="gap-2 px-3 py-1.5 text-xs font-semibold border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30"
                        >
                            <RotateCcw className={cn('h-3.5 w-3.5', resetting && 'animate-spin')} />
                            {resetting ? 'Resetting...' : 'Reset'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
