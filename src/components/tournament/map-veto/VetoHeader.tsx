import React, { useState } from 'react';
import { Check, Link2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/ui/kit';
import { CommandButton } from '@/components/management/CommandSurface';
import { MatchMapVeto } from '@/hooks/useMapVetoMachine';
import { useToast } from '@/hooks/use-toast';

interface VetoHeaderProps {
    /** The scorebug carries the format now; kept for API compatibility. */
    boText?: string;
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

const STATUS_PILL: Record<MatchMapVeto['status'], { label: string; tone: 'success' | 'neutral' }> = {
    // The scorebug's active-team marker is the one rose cue; the pill stays quiet.
    in_progress: { label: 'In progress', tone: 'neutral' },
    completed: { label: 'Complete', tone: 'success' },
    pending: { label: 'Not started', tone: 'neutral' },
    cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const VetoHeader: React.FC<VetoHeaderProps> = ({
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
    const status = STATUS_PILL[vetoStatus] ?? STATUS_PILL.pending;

    const copyLink = async (token: string, team: 'team1' | 'team2', teamName: string) => {
        const link = getTeamVetoUrl
            ? getTeamVetoUrl(token)
            : `${window.location.origin}/map-veto/${token}`;
        await navigator.clipboard.writeText(link);
        setCopiedTeam(team);
        toast({ title: 'Link copied', description: `Send it to ${teamName}'s captain.` });
        setTimeout(() => setCopiedTeam(null), 2000);
    };

    const showControls = effectiveIsOrganizer && (Boolean(vetoId) || (showShareLinks && Boolean(team1LinkToken || team2LinkToken)));

    return (
        <div className={cn(
            'flex flex-wrap items-center justify-between gap-x-4 gap-y-3',
            compact ? 'mb-1' : 'mb-2',
        )}>
            <div className="flex min-w-0 items-center gap-3">
                <h2 className={cn(
                    'font-heading font-black tracking-tight text-white',
                    compact ? 'text-lg' : 'text-xl sm:text-2xl',
                )}>
                    Map veto
                </h2>
                <StatusPill label={status.label} tone={status.tone} />
            </div>

            {showControls ? (
                <div className="flex flex-wrap items-center gap-2">
                    {showShareLinks && team1LinkToken ? (
                        <CommandButton
                            variant="ghost"
                            size="sm"
                            onClick={() => copyLink(team1LinkToken, 'team1', team1Name)}
                            aria-label={`Copy veto link for ${team1Name}`}
                        >
                            {copiedTeam === 'team1' ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                            <span className="max-w-[9rem] truncate normal-case tracking-normal">{team1Name}</span>
                        </CommandButton>
                    ) : null}
                    {showShareLinks && team2LinkToken ? (
                        <CommandButton
                            variant="ghost"
                            size="sm"
                            onClick={() => copyLink(team2LinkToken, 'team2', team2Name)}
                            aria-label={`Copy veto link for ${team2Name}`}
                        >
                            {copiedTeam === 'team2' ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                            <span className="max-w-[9rem] truncate normal-case tracking-normal">{team2Name}</span>
                        </CommandButton>
                    ) : null}
                    {vetoId ? (
                        <CommandButton
                            variant="ghost"
                            size="sm"
                            onClick={handleResetVeto}
                            disabled={resetting}
                        >
                            <RotateCcw className={cn('h-3.5 w-3.5', resetting && 'animate-spin')} />
                            {resetting ? 'Resetting' : 'Reset veto'}
                        </CommandButton>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};
