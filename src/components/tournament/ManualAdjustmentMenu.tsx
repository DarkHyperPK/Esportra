import React, { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreVertical, Award, ArrowLeftRight, RotateCcw, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { optimisticBracket } from '@/services/bracket/optimisticBracket';

interface ManualAdjustmentMenuProps {
    matchId: string;
    tournamentId?: string;
    team1Id: string | undefined;
    team2Id: string | undefined;
    team1Name: string;
    team2Name: string;
    matchStatus: string;
    onAdjustmentMade?: () => void;
    bestOf?: number;
    versionId?: string | null;
}

type AdjustmentAction = 'walkover_team1' | 'walkover_team2' | 'swap' | 'reset';

const ManualAdjustmentMenu: React.FC<ManualAdjustmentMenuProps> = ({
    matchId,
    tournamentId,
    team1Id,
    team2Id,
    team1Name,
    team2Name,
    matchStatus,
    onAdjustmentMade,
    bestOf,
    versionId,
}) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<AdjustmentAction | null>(null);
    const [processing, setProcessing] = useState(false);

    const actionLabels: Record<AdjustmentAction, { title: string; description: string }> = {
        walkover_team1: {
            title: `Award Walkover to ${team1Name}`,
            description: `${team2Name} will be marked as forfeiting. ${team1Name} advances.`,
        },
        walkover_team2: {
            title: `Award Walkover to ${team2Name}`,
            description: `${team1Name} will be marked as forfeiting. ${team2Name} advances.`,
        },
        swap: {
            title: 'Swap Team Positions',
            description: 'Team 1 becomes Team 2 and vice versa. Useful for seeding corrections.',
        },
        reset: {
            title: 'Reset Match',
            description: 'Clear the match result and reset to pending status.',
        },
    };

    const handleAction = (action: AdjustmentAction) => {
        setPendingAction(action);
        setConfirmOpen(true);
    };

    const executeAction = async () => {
        if (!pendingAction) return;

        setProcessing(true);

        // --- OPTIMISTIC SNAPSHOT ---
        const queryKey = ['bracket-graph', versionId];
        let previousGraphData: any = null;
        if (versionId) {
            previousGraphData = queryClient.getQueryData<{ nodes: any[]; edges: any[] }>(queryKey);
        }

        try {
            switch (pendingAction) {
                case 'walkover_team1':
                case 'walkover_team2': {
                    const winnerId = pendingAction === 'walkover_team1' ? team1Id : team2Id;
                    const loserId = pendingAction === 'walkover_team1' ? team2Id : team1Id;
                    const winnerName = pendingAction === 'walkover_team1' ? team1Name : team2Name;
                    const rawMatchId = matchId.replace(/^(db-|wb-|lb-)/, '');

                    const team1Score = pendingAction === 'walkover_team1' ? ((bestOf === 1 ? 13 : Math.ceil((bestOf || 1) / 2))) : 0;
                    const team2Score = pendingAction === 'walkover_team2' ? ((bestOf === 1 ? 13 : Math.ceil((bestOf || 1) / 2))) : 0;

                    // --- OPTIMISTIC APPLY WALKOVER ---
                    if (previousGraphData && versionId) {
                        const nodesWithScore = optimisticBracket.applyScore(
                            previousGraphData.nodes,
                            rawMatchId,
                            team1Score,
                            team2Score,
                            team1Id || null,
                            team2Id || null
                        );
                        const nodesWithAdvancement = optimisticBracket.applyAdvancement(
                            nodesWithScore,
                            previousGraphData.edges,
                            rawMatchId,
                            winnerId,
                            loserId
                        );
                        queryClient.setQueryData(queryKey, {
                            ...previousGraphData,
                            nodes: nodesWithAdvancement,
                        });
                    }
                    // ---------------------------------

                    await apiClient.post(`/api/matches/${rawMatchId}/award-walkover`, {
                        winnerId,
                        loserId,
                        team1Score,
                        team2Score,
                    });

                    toast({ title: 'Walkover Applied', description: `${winnerName} wins by walkover.` });
                    break;
                }

                case 'swap': {
                    const rawMatchId = matchId.replace(/^(db-|wb-|lb-)/, '');

                    // --- OPTIMISTIC APPLY SWAP ---
                    if (previousGraphData && versionId) {
                        const nodesWithSwap = optimisticBracket.applySwap(
                            previousGraphData.nodes,
                            rawMatchId
                        );
                        queryClient.setQueryData(queryKey, {
                            ...previousGraphData,
                            nodes: nodesWithSwap,
                        });
                    }
                    // -------------------------------

                    await apiClient.post(`/api/matches/${rawMatchId}/swap-teams`);

                    toast({ title: 'Teams Swapped', description: 'Team positions have been exchanged.' });
                    break;
                }

                case 'reset': {
                    const rawMatchId = matchId.replace(/^(db-|wb-|lb-)/, '');

                    // --- OPTIMISTIC APPLY RESET ---
                    if (previousGraphData && versionId) {
                        const nodesWithReset = optimisticBracket.applyReset(
                            previousGraphData.nodes,
                            rawMatchId
                        );
                        queryClient.setQueryData(queryKey, {
                            ...previousGraphData,
                            nodes: nodesWithReset,
                        });
                    }
                    // ---------------------------------

                    await apiClient.post(`/api/matches/${rawMatchId}/reset`);

                    // Invalidate relevant queries to refresh the UI
                    await queryClient.invalidateQueries({ queryKey: ['match-result-reports', rawMatchId] });
                    await queryClient.invalidateQueries({ queryKey: ['bracket-graph'] });
                    await queryClient.invalidateQueries({ queryKey: ['captain-all-matches'] });

                    toast({ title: 'Match Reset', description: 'Match data cleared and reset to pending.' });
                    break;
                }
            }

            onAdjustmentMade?.();
        } catch (err: any) {
            // ROLLBACK OPTIMISTIC UPDATE
            if (previousGraphData && versionId) {
                queryClient.setQueryData(queryKey, previousGraphData);
            }

            console.error('Manual adjustment error:', err);
            const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
            toast({
                title: 'Action Failed',
                description: `Error: ${errorMessage}`,
                variant: 'destructive'
            });
        } finally {
            setProcessing(false);
            setConfirmOpen(false);
            setPendingAction(null);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-zinc-800"
                    >
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-56 bg-zinc-900 border-zinc-800 text-white"
                >
                    <DropdownMenuLabel className="text-zinc-400 text-xs">
                        Manual Adjustments
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-800" />

                    {/* Walkover options */}
                    <DropdownMenuItem
                        onClick={() => handleAction('walkover_team1')}
                        disabled={!team1Id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800"
                    >
                        <Award className="w-4 h-4 text-emerald-400" />
                        <span>Walkover: {team1Name} wins</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleAction('walkover_team2')}
                        disabled={!team2Id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800"
                    >
                        <Award className="w-4 h-4 text-emerald-400" />
                        <span>Walkover: {team2Name} wins</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-zinc-800" />

                    {/* Other actions */}
                    <DropdownMenuItem
                        onClick={() => handleAction('swap')}
                        disabled={!team1Id || !team2Id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800"
                    >
                        <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                        <span>Swap Teams</span>
                    </DropdownMenuItem>

                    {matchStatus === 'completed' && (
                        <DropdownMenuItem
                            onClick={() => handleAction('reset')}
                            className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800"
                        >
                            <RotateCcw className="w-4 h-4 text-amber-400" />
                            <span>Reset Match</span>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Confirmation Dialog */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingAction && actionLabels[pendingAction].title}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            {pendingAction && actionLabels[pendingAction].description}
                            <br /><br />
                            <span className="text-amber-400">This action cannot be easily undone.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={executeAction}
                            disabled={processing}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {processing ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default ManualAdjustmentMenu;
