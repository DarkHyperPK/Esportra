/**
 * Party Code Dialog
 * 
 * Displays the party code for captains to join the match lobby.
 */

import React from 'react';
import { Copy, Check, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

export interface PartyCodeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    partyCode: string | null;
    onCopy: () => void;
    copied: boolean;
}

export const PartyCodeDialog: React.FC<PartyCodeDialogProps> = ({
    open,
    onOpenChange,
    partyCode,
    onCopy,
    copied
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] bg-gaming-dark border border-gaming-gray/40">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Radio className="w-5 h-5 text-green-400" />
                        Match Party Code
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Use this code to join the custom lobby in-game.
                    </DialogDescription>
                </DialogHeader>
                {partyCode && (
                    <div className="space-y-4">
                        <div className="bg-gaming-gray/20 rounded-lg p-6 border border-gaming-gray/30">
                            <div className="text-center">
                                <div className="text-3xl font-bold tracking-widest text-green-400 mb-2 font-mono">
                                    {partyCode}
                                </div>
                                <p className="text-xs text-gray-400">Match is currently LIVE</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={onCopy}
                                className="flex-1 bg-gaming-purple hover:bg-gaming-purple/80 flex items-center justify-center"
                                variant="default"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4 mr-2" /> Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 mr-2" /> Copy Code
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={() => onOpenChange(false)}
                                variant="outline"
                                className="border-gaming-gray/40"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default PartyCodeDialog;
