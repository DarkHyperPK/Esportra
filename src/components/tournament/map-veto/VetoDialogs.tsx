import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sword, Shield as ShieldIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchMapVeto, getVetoFormat, getSidePickerTeam, GameMap } from '@/hooks/useMapVetoMachine';
import { useToast } from '@/hooks/use-toast';

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

    // Props for compatibility if passed from parent but unused
    dialogStep?: any;
    setDialogStep?: any;
    selectedMapPool?: any;
    setSelectedMapPool?: any;
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
}) => {
    return (
        <>
            {/* Role Switch Prompt */}
            <Dialog open={showRoleSwitchPrompt} onOpenChange={setShowRoleSwitchPrompt}>
                <DialogContent className="bg-gray-900 border-gray-700">
                    <DialogHeader>
                        <DialogTitle className="text-white text-xl font-black">Switch Role Required</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            You are currently in organizer mode, but you are also the captain of one of the teams in this match.
                            To participate in the map veto process, you need to switch to player role.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-gray-300 mb-4">
                            As an organizer, you can only view the veto process. To make picks/bans, switch to player role.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => setShowRoleSwitchPrompt(false)}
                            variant="outline"
                            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                        >
                            Stay as Organizer (View Only)
                        </Button>
                        <Button
                            onClick={handleRoleSwitch}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Switch to Player Role
                        </Button>
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
                <DialogContent className="bg-black border-2 border-white/20 max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="px-8 pt-8 pb-6 border-b border-white/10">
                        <DialogTitle className="text-white text-2xl font-black tracking-tight mb-2">Select Best Of Format</DialogTitle>
                        <DialogDescription className="text-white/60 text-base leading-relaxed">
                            Choose the format for this match. This will determine the map veto sequence.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto">
                            {[1, 3, 5].map((bo) => {
                                const isSelected = selectedBO === bo;
                                const isDisabled = selectedBO !== null && selectedBO !== bo;
                                return (
                                    <button
                                        key={bo}
                                        onClick={() => handleSetBO(bo)}
                                        disabled={isDisabled}
                                        aria-label={`Select Best of ${bo} format`}
                                        className={cn(
                                            "relative p-6 sm:p-8 rounded-xl border-2 transition-all duration-200",
                                            "hover:scale-[1.02] hover:shadow-xl",
                                            isSelected
                                                ? "bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-500/30"
                                                : isDisabled
                                                    ? "bg-black/30 border-white/10 text-white/30 cursor-not-allowed opacity-50"
                                                    : "bg-black/50 border-white/20 text-white hover:border-blue-500/50 hover:bg-white/5"
                                        )}
                                    >
                                        <div className="text-center">
                                            <div className="text-3xl sm:text-4xl font-black mb-2 sm:mb-3">BO{bo}</div>
                                            <div className="text-xs text-white/60 font-medium uppercase tracking-wider">
                                                {bo === 1 ? 'Pick 1 map' : bo === 3 ? '7 actions' : '11 actions'}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                                                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <DialogFooter className="px-8 py-6 border-t border-white/10 bg-black/50 gap-3">
                        <Button
                            onClick={() => setShowBODialog(false)}
                            variant="outline"
                            className="bg-transparent border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30 px-6"
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Side Selection Dialog */}
            <Dialog open={showSideDialog} onOpenChange={setShowSideDialog}>
                <DialogContent className="sm:max-w-md bg-black border-2 border-white/20">
                    <DialogHeader>
                        <DialogTitle className="text-white text-xl font-black uppercase tracking-wider">Select Starting Side</DialogTitle>
                        <DialogDescription className="text-white/60">
                            Choose which side you want to start on for <span className="text-white font-bold">{pendingMapId && availableMaps.find(m => m.id === pendingMapId)?.map_name}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {(() => {
                        if (!veto) return null;
                        const currentActionNum = veto.current_action_number || 1;
                        const vetoFormat = getVetoFormat(veto.best_of || 1);
                        const pickActionNumber = currentActionNum - 1;

                        const sidePickerTeamId = getSidePickerTeam(
                            pickActionNumber,
                            vetoFormat,
                            veto.team1_id!,
                            veto.team2_id!
                        );

                        const sidePickerTeamName = sidePickerTeamId === veto.team1_id ? team1Name : team2Name;

                        return (
                            <div className="flex items-center justify-center gap-2 py-4 border-y border-white/10">
                                <CheckCircle className="h-6 w-6 text-green-500" />
                                <span className="text-white font-bold text-lg">{sidePickerTeamName}</span>
                            </div>
                        );
                    })()}

                    <div className="space-y-3 py-4">
                        <Button
                            onClick={async () => {
                                if (pendingMapId) {
                                    await performMapAction(pendingMapId, 'pick_side', 'attack');
                                    setShowSideDialog(false);
                                    setPendingMapId(null);
                                }
                            }}
                            className="w-full h-20 bg-orange-600 hover:bg-orange-700 text-white text-lg font-black gap-3 border-2 border-white/20 flex items-center justify-center"
                        >
                            <Sword className="h-8 w-8" />
                            <span className="text-xl">ATTACK</span>
                        </Button>
                        <Button
                            onClick={async () => {
                                if (pendingMapId) {
                                    await performMapAction(pendingMapId, 'pick_side', 'defend');
                                    setShowSideDialog(false);
                                    setPendingMapId(null);
                                }
                            }}
                            className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white text-lg font-black gap-3 border-2 border-white/20 flex items-center justify-center"
                        >
                            <ShieldIcon className="h-8 w-8" />
                            <span className="text-xl">DEFEND</span>
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowSideDialog(false);
                                setPendingMapId(null);
                                setActionLoading(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
