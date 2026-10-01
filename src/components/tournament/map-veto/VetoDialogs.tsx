import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CancelButton, CtaButton, GhostButton } from '@/components/ui/app-buttons';
import { cn } from '@/lib/utils';
import { MatchMapVeto, getVetoFormat, getSidePickerTeam, GameMap, VetoService } from '@/hooks/useMapVetoMachine';

interface VetoDialogsProps {
    showRoleSwitchPrompt: boolean;
    setShowRoleSwitchPrompt: (show: boolean) => void;
    handleRoleSwitch: () => void;

    showBODialog: boolean;
    setShowBODialog: (show: boolean) => void;
    // dialogStep, setDialogStep, selectedMapPool, setSelectedMapPool removed
    availableMaps: GameMap[]; // Used for side selection map name
    allAvailableMaps: GameMap[]; // Not used anymore in dialog
    imagesLoaded: Set<string>;
    setImagesLoaded: React.Dispatch<React.SetStateAction<Set<string>>>;
    selectedBO: number | null;
    handleSetBO: (bo: number) => void;
    setDialogManuallyClosed: (closed: boolean) => void;
    veto: MatchMapVeto | null;

    showSideDialog: boolean;
    setShowSideDialog: (show: boolean) => void;
    pendingMapId: string | null;
    setPendingMapId: (id: string | null) => void;
    performMapAction: (mapId: string, actionType: 'ban' | 'pick' | 'pick_side', side: 'attack' | 'defend' | null) => Promise<void>;
    setActionLoading: (id: string | null) => void;

    team1Name: string;
    team2Name: string;
    game?: string;

    // Props for compatibility if passed from parent but unused
    dialogStep?: any;
    setDialogStep?: any;
    selectedMapPool?: any;
    setSelectedMapPool?: any;
    bestOf: number;
}

function sidePickerName(
    veto: MatchMapVeto | null,
    bestOf: number,
    game: string,
    poolSize: number,
    team1Name: string,
    team2Name: string,
) {
    if (!veto?.team1_id || !veto.team2_id) return 'Your team';
    const currentActionNum = veto.current_action_number || 1;
    const vetoFormat = getVetoFormat(bestOf || 1);
    const service = new VetoService(game, poolSize || undefined);
    const actionNumber = service.isDeciderAction(vetoFormat, currentActionNum) ? currentActionNum : currentActionNum - 1;
    const teamId = getSidePickerTeam(actionNumber, vetoFormat, veto.team1_id, veto.team2_id);
    return teamId === veto.team1_id ? team1Name : team2Name;
}

export const VetoDialogs: React.FC<VetoDialogsProps> = ({
    showRoleSwitchPrompt,
    setShowRoleSwitchPrompt,
    handleRoleSwitch,
    showBODialog,
    setShowBODialog,
    availableMaps,
    selectedBO,
    handleSetBO,
    setDialogManuallyClosed,
    veto,
    showSideDialog,
    setShowSideDialog,
    pendingMapId,
    setPendingMapId,
    performMapAction,
    setActionLoading,
    team1Name,
    team2Name,
    bestOf,
    game = 'valorant',
}) => {
    return (
        <>
            {/* Role Switch Prompt */}
            <Dialog open={showRoleSwitchPrompt} onOpenChange={setShowRoleSwitchPrompt}>
                <DialogContent className="bg-zinc-950 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white text-xl font-black">Switch Role Required</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            You are currently in organizer mode, but you are also the captain of one of the teams in this match.
                            To participate in the map veto process, you need to switch to player role.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-zinc-300 mb-4">
                            As an organizer, you can only view the veto process. To make picks/bans, switch to player role.
                        </p>
                    </div>
                    <DialogFooter>
                        <GhostButton type="button"
                            onClick={() => setShowRoleSwitchPrompt(false)}
                        >
                            Stay as Organizer (View Only)
                        </GhostButton>
                        <CtaButton
                            onClick={handleRoleSwitch}
                        >
                            Switch to Player Role
                        </CtaButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* BO Selection Dialog */}
            <Dialog open={showBODialog} onOpenChange={(open) => {
                if (!open) {
                    setDialogManuallyClosed(true);
                }
                setShowBODialog(open);
            }}>
                <DialogContent className="flex max-h-[95vh] max-w-2xl flex-col gap-0 overflow-hidden rounded-none border border-white/10 bg-background p-0">
                    <DialogHeader className="border-b border-white/[0.07] px-6 pb-5 pt-6 text-left sm:px-8">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Map veto</p>
                        <DialogTitle className="font-heading text-2xl font-black tracking-tight text-white">How many maps?</DialogTitle>
                        <DialogDescription className="text-sm text-zinc-400">
                            The format sets the veto order. You can't change it once the first map is banned.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8" data-lenis-prevent>
                        <div className="grid grid-cols-1 gap-px bg-white/[0.06] sm:grid-cols-3" role="radiogroup" aria-label="Series format">
                            {[1, 3, 5].map((bo) => {
                                const isSelected = selectedBO === bo;
                                const isDisabled = selectedBO !== null && selectedBO !== bo;
                                return (
                                    <button
                                        type="button"
                                        key={bo}
                                        role="radio"
                                        aria-checked={isSelected}
                                        onClick={() => handleSetBO(bo)}
                                        disabled={isDisabled}
                                        className={cn(
                                            'flex flex-col items-start gap-3 bg-card px-5 py-6 text-left transition-[box-shadow,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                                            isSelected
                                                ? 'bg-rose-500/[0.06] shadow-[inset_0_0_0_1px_rgba(244,63,94,0.7)]'
                                                : 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]',
                                            isDisabled && 'cursor-not-allowed opacity-40',
                                        )}
                                    >
                                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Best of</span>
                                        <span className="font-heading text-5xl font-black leading-none tabular-nums text-white">{bo}</span>
                                        <span className="text-sm text-zinc-400">
                                            {bo === 1 ? 'One map decides the match.' : bo === 3 ? 'Three maps. First to two.' : 'Five maps. First to three.'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <DialogFooter className="border-t border-white/[0.07] px-6 py-4 sm:px-8">
                        <CancelButton type="button" onClick={() => setShowBODialog(false)}>
                            Cancel
                        </CancelButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Side Selection Dialog */}
            <Dialog open={showSideDialog} onOpenChange={setShowSideDialog}>
                <DialogContent className="gap-0 rounded-none border border-white/10 bg-background p-0 sm:max-w-md">
                    <DialogHeader className="border-b border-white/[0.07] px-6 pb-5 pt-6 text-left">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                            {sidePickerName(veto, bestOf, game, availableMaps.length, team1Name, team2Name)} · Starting side
                        </p>
                        <DialogTitle className="font-heading text-2xl font-black tracking-tight text-white">
                            {pendingMapId ? availableMaps.find((m) => m.id === pendingMapId)?.map_name ?? 'Selected map' : 'Selected map'}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-zinc-400">
                            Pick the side your team starts on. Sides swap at half-time.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-px bg-white/[0.06]">
                        {(['attack', 'defend'] as const).map((side) => (
                            <button
                                key={side}
                                type="button"
                                onClick={async () => {
                                    if (pendingMapId) {
                                        await performMapAction(pendingMapId, 'pick_side', side);
                                        setShowSideDialog(false);
                                        setPendingMapId(null);
                                    }
                                }}
                                className="group relative flex h-32 flex-col items-start justify-end gap-1 overflow-hidden bg-card px-5 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
                            >
                                <span aria-hidden className="absolute inset-0 translate-y-full bg-white transition-transform duration-200 ease-[cubic-bezier(0.3,0,0,1)] group-hover:translate-y-0 group-focus-visible:translate-y-0" />
                                <span className="relative font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500 group-hover:text-zinc-600">
                                    {side === 'attack' ? 'ATK' : 'DEF'}
                                </span>
                                <span className="relative font-heading text-2xl font-black tracking-tight text-white group-hover:text-matte-black group-focus-visible:text-matte-black">
                                    {side === 'attack' ? 'Attack' : 'Defense'}
                                </span>
                            </button>
                        ))}
                    </div>
                    <DialogFooter className="border-t border-white/[0.07] px-6 py-4">
                        <CancelButton type="button"
                            onClick={() => {
                                setShowSideDialog(false);
                                setPendingMapId(null);
                                setActionLoading(null);
                            }}
                        >
                            Cancel
                        </CancelButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
