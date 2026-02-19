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
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

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
        try {
            switch (pendingAction) {
                case 'walkover_team1':
                case 'walkover_team2': {
                    const winnerId = pendingAction === 'walkover_team1' ? team1Id : team2Id;
                    const winnerName = pendingAction === 'walkover_team1' ? team1Name : team2Name;

                    // Update match with walkover result
                    const { error } = await supabase
                        .from('brkt_matches')
                        .update({
                            winner_id: winnerId,
                            status: 'completed',
                            // Calculate score based on bestOf
                            team1_score: pendingAction === 'walkover_team1' ? ((bestOf === 1 ? 13 : Math.ceil((bestOf || 1) / 2))) : 0,
                            team2_score: pendingAction === 'walkover_team2' ? ((bestOf === 1 ? 13 : Math.ceil((bestOf || 1) / 2))) : 0,
                        })
                        .eq('id', matchId);

                    if (error) throw error;
                    toast({ title: 'Walkover Applied', description: `${winnerName} wins by walkover.` });
                    break;
                }

                case 'swap': {
                    // Fetch current match to get team IDs
                    const { data: match, error: fetchError } = await supabase
                        .from('brkt_matches')
                        .select('team1_id, team2_id, team1_score, team2_score')
                        .eq('id', matchId)
                        .single();

                    if (fetchError) throw fetchError;

                    // Swap teams
                    const { error } = await supabase
                        .from('brkt_matches')
                        .update({
                            team1_id: match.team2_id,
                            team2_id: match.team1_id,
                            team1_score: match.team2_score,
                            team2_score: match.team1_score,
                        })
                        .eq('id', matchId);

                    if (error) throw error;
                    toast({ title: 'Teams Swapped', description: 'Team positions have been exchanged.' });
                    break;
                }

                case 'reset': {
                    const rawMatchId = matchId.replace(/^(db-|wb-|lb-)/, '');

                    // 1. Delete associated game results
                    await supabase.from('brkt_match_games').delete().eq('match_id', rawMatchId);

                    // 2. Reset Map Veto via RPC (if exists) or manual deletion
                    const { error: vetoRpcError } = await supabase.rpc('reset_match_veto', {
                        p_match_id: rawMatchId
                    });

                    if (vetoRpcError) {
                        console.warn('Veto RPC reset failed, falling back to manual deletion:', vetoRpcError);
                        await supabase.from('match_map_veto_actions').delete().eq('match_id', rawMatchId);
                        await supabase.from('match_map_vetos').delete().eq('match_id', rawMatchId);
                    }

                    // 3. Delete captain reports/screenshots/automated reports
                    await supabase.from('tournament_match_results').delete().eq('match_id', rawMatchId);
                    await supabase.from('match_result_reports').delete().eq('match_id', rawMatchId);
                    await supabase.from('tournament_disputes').delete().eq('match_id', rawMatchId);

                    // 4. Reset main match record
                    const { error } = await supabase
                        .from('brkt_matches')
                        .update({
                            winner_id: null,
                            status: 'pending',
                            team1_score: 0,
                            team2_score: 0,
                            party_code: null,
                        })
                        .eq('id', rawMatchId);

                    if (error) throw error;

                    // 5. Invalidate relevant queries to refresh the UI
                    await queryClient.invalidateQueries({ queryKey: ['match-result-reports', rawMatchId] });
                    await queryClient.invalidateQueries({ queryKey: ['bracket-graph'] });
                    await queryClient.invalidateQueries({ queryKey: ['captain-all-matches'] });

                    toast({ title: 'Match Reset', description: 'Match data cleared and reset to pending.' });
                    break;
                }
            }

            onAdjustmentMade?.();
        } catch (error: any) {
            console.error('Manual adjustment error:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
