/**
 * Edit Match Dialog
 * 
 * Allows editing match scheduled time.
 */

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

export interface EditMatchDraft {
    scheduled_at: string;
    best_of: string;
}

export interface EditMatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draft: EditMatchDraft | null;
    onDraftChange: (draft: EditMatchDraft) => void;
    onSave: () => void;
}

export const EditMatchDialog: React.FC<EditMatchDialogProps> = ({
    open,
    onOpenChange,
    draft,
    onDraftChange,
    onSave
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] bg-gaming-dark border border-gaming-gray/40">
                <DialogHeader>
                    <DialogTitle className="text-white">Edit Match</DialogTitle>
                    <DialogDescription className="text-gray-400">Set match scheduled time.</DialogDescription>
                </DialogHeader>
                {draft && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Scheduled time</label>
                            <input
                                type="datetime-local"
                                value={draft.scheduled_at}
                                onChange={(e) => onDraftChange({ ...draft, scheduled_at: e.target.value })}
                                className="w-full bg-[#16161d] border border-[#2a2a35] rounded px-3 py-2 text-sm text-white"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                        <div className="text-right">
                            <button
                                className="text-xs px-3 py-2 rounded bg-gaming-purple/70 hover:bg-gaming-purple/80 border border-gaming-purple/40"
                                onClick={onSave}
                            >
                                Save changes
                            </button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default EditMatchDialog;
