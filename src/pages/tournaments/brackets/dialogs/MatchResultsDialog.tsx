/**
 * Match Results Dialog
 * 
 * Displays submitted result images and comments for a match.
 */

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

export interface MatchResult {
    image_url: string | null;
    comment: string | null;
    created_at: string;
    reporter_user_id: string;
}

export interface MatchResultsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    results: MatchResult[];
}

export const MatchResultsDialog: React.FC<MatchResultsDialogProps> = ({
    open,
    onOpenChange,
    results
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[720px] bg-gaming-dark border border-gaming-gray/40">
                <DialogHeader>
                    <DialogTitle className="text-white">Submitted Results</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Images and comments submitted by teams for this match.
                    </DialogDescription>
                </DialogHeader>
                {results.length === 0 ? (
                    <div className="text-gray-400 text-sm">No results submitted yet.</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {results.map((r, i) => (
                            <div key={i} className="bg-gaming-gray/20 rounded border border-gaming-gray/30 overflow-hidden">
                                {r.image_url ? (
                                    <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="block">
                                        <img src={r.image_url} alt="result" className="w-full h-32 object-cover" />
                                    </a>
                                ) : (
                                    <div className="w-full h-32 flex items-center justify-center text-xs text-gray-400">No image</div>
                                )}
                                <div className="p-2">
                                    <div className="text-[10px] text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                                    {r.comment && <div className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">{r.comment}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default MatchResultsDialog;
