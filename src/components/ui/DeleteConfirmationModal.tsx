import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';

interface CascadeWarning {
    entity: string;
    count: number;
    description?: string;
}

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    entityType: 'tournament' | 'team' | 'venue';
    entityName: string;
    isDeleting?: boolean;
    cascadeWarnings?: CascadeWarning[];
    requireNameConfirmation?: boolean;
    customWarning?: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    entityType,
    entityName,
    isDeleting = false,
    cascadeWarnings = [],
    requireNameConfirmation = false,
    customWarning,
}) => {
    const [confirmationText, setConfirmationText] = useState('');
    const [error, setError] = useState('');

    const handleConfirm = () => {
        if (requireNameConfirmation && confirmationText !== entityName) {
            setError(`Please type "${entityName}" exactly to confirm deletion`);
            return;
        }
        setError('');
        onConfirm();
    };

    const handleClose = () => {
        setConfirmationText('');
        setError('');
        onClose();
    };

    const isConfirmDisabled = requireNameConfirmation && confirmationText !== entityName;
    const hasCascadeWarnings = cascadeWarnings.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] bg-[#09090b] border border-white/10 shadow-[0_0_40px_-10px_rgba(220,38,38,0.2)] p-0 gap-0 overflow-hidden">

                {/* Header with gradient subtle glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-rose-600" />

                <DialogHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-3 text-xl font-bold text-white tracking-tight">
                            <div className="p-2 bg-red-500/10 border border-red-500/20">
                                <Trash2 className="h-5 w-5 text-red-500" />
                            </div>
                            Delete {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
                        </DialogTitle>
                        <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/10">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <DialogDescription className="text-zinc-400 text-sm mt-2">
                        This action will soft delete the <span className="font-medium text-zinc-300">{entityType}</span>. It can be restored within 7 days.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-5">
                    {/* Entity Name Display - Glass Card */}
                    <div className="bg-[#0a0a0c] border border-white/5 p-4 flex flex-col items-center text-center">
                        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">You are deleting</p>
                        <p className="text-lg font-bold text-white">{entityName}</p>
                    </div>

                    {/* Custom Warning */}
                    {customWarning && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-3 flex gap-3 items-start">
                            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                            <p className="text-rose-200/90 text-sm leading-relaxed">{customWarning}</p>
                        </div>
                    )}

                    {/* Cascade Warnings */}
                    {hasCascadeWarnings && (
                        <div className="bg-red-500/5 border border-red-500/10 p-4">
                            <div className="flex items-center gap-2 mb-3 text-red-400 text-sm font-semibold">
                                <AlertCircle className="h-4 w-4" />
                                <span>This will also affect:</span>
                            </div>
                            <ul className="space-y-2">
                                {cascadeWarnings.map((warning, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-zinc-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500/50 mt-1.5 shrink-0" />
                                        <span>
                                            <strong className="text-white">{warning.count}</strong> {warning.entity}
                                            {warning.count !== 1 ? 's' : ''}
                                            {warning.description && (
                                                <span className="text-zinc-500"> - {warning.description}</span>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Confirmation Input - With Framer Motion shake on error? simplified for now */}
                    {requireNameConfirmation && (
                        <div className="space-y-3">
                            <Label htmlFor="confirmation" className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                                Type <span className="text-white font-mono">{entityName}</span> to confirm
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirmation"
                                    value={confirmationText}
                                    onChange={(e) => {
                                        setConfirmationText(e.target.value);
                                        setError('');
                                    }}
                                    placeholder={`Type "${entityName}" here`}
                                    className={`bg-black/40 border-zinc-800 text-white placeholder:text-zinc-600 focus:ring-red-500/20 focus:border-red-500/50 transition-all ${error ? 'border-red-500/50 animate-shake' : ''}`}
                                    disabled={isDeleting}
                                    autoComplete="off"
                                />
                            </div>
                            {error && (
                                <p className="text-xs text-red-400 flex items-center gap-1.5 animate-in slide-in-from-top-1">
                                    <AlertCircle className="h-3 w-3" /> {error}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-2 gap-3 sm:gap-0 bg-zinc-900/30 border-t border-white/5">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isDeleting}
                        className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isDeleting || isConfirmDisabled}
                        className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border-0 shadow-lg shadow-red-900/20"
                    >
                        {isDeleting ? (
                            <>
                                <span className="animate-spin mr-2 h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete {entityType}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
