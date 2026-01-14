/**
 * Go Live Dialog
 * 
 * Allows organizer to enter party code and set match to live.
 */

import React from 'react';
import { Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

export interface GoLiveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    partyCodeInput: string;
    onPartyCodeChange: (code: string) => void;
    onGoLive: () => void;
    onCancel: () => void;
}

export const GoLiveDialog: React.FC<GoLiveDialogProps> = ({
    open,
    onOpenChange,
    partyCodeInput,
    onPartyCodeChange,
    onGoLive,
    onCancel
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] bg-gaming-dark border border-gaming-gray/40">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Radio className="w-5 h-5 text-green-400" />
                        Go Live - Enter Party Code
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Enter the party code from your in-game custom lobby. After going live, you'll have 5 minutes for team members to join, then the veto setup will begin.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Party Code</label>
                        <input
                            type="text"
                            value={partyCodeInput}
                            onChange={(e) => onPartyCodeChange(e.target.value.toUpperCase())}
                            placeholder="Enter party code (e.g., ABC123)"
                            className="w-full bg-[#16161d] border border-[#2a2a35] rounded-lg px-4 py-3 text-lg font-mono text-center tracking-widest text-white uppercase"
                            maxLength={20}
                            style={{ colorScheme: 'dark' }}
                            autoFocus
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            This code will be visible to team captains only.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={onGoLive}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            variant="default"
                            disabled={!partyCodeInput.trim()}
                        >
                            <Radio className="w-4 h-4 mr-2" /> Go Live
                        </Button>
                        <Button
                            onClick={onCancel}
                            variant="outline"
                            className="border-gaming-gray/40"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GoLiveDialog;
