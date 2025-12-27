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
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
            <DialogContent className="sm:max-w-[500px] bg-gray-900 border border-gray-700">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <Trash2 className="h-5 w-5 text-red-500" />
                        Delete {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        This action will soft delete the {entityType}. It can be restored within 7 days.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Entity Name Display */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">You are about to delete:</p>
                        <p className="text-lg font-semibold text-white">{entityName}</p>
                    </div>

                    {/* Custom Warning */}
                    {customWarning && (
                        <Alert className="bg-yellow-900/20 border-yellow-500/50">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <AlertDescription className="text-yellow-200 text-sm">
                                {customWarning}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Cascade Warnings */}
                    {hasCascadeWarnings && (
                        <Alert className="bg-red-900/20 border-red-500/50">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <AlertDescription className="text-red-200">
                                <p className="font-semibold mb-2">This will also affect:</p>
                                <ul className="space-y-1 text-sm">
                                    {cascadeWarnings.map((warning, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <span className="text-red-400">•</span>
                                            <span>
                                                <strong>{warning.count}</strong> {warning.entity}
                                                {warning.count !== 1 ? 's' : ''}
                                                {warning.description && (
                                                    <span className="text-gray-400"> - {warning.description}</span>
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Soft Delete Info */}
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-sm text-blue-200">
                            <strong>Soft Delete:</strong> This {entityType} will be hidden but not permanently deleted.
                            You can restore it within <strong>7 days</strong> from the "Deleted {entityType.charAt(0).toUpperCase() + entityType.slice(1)}s" section.
                        </p>
                    </div>

                    {/* Confirmation Input */}
                    {requireNameConfirmation && (
                        <div className="space-y-2">
                            <Label htmlFor="confirmation" className="text-white">
                                Type <span className="font-mono bg-gray-800 px-2 py-0.5 rounded text-red-400">{entityName}</span> to confirm
                            </Label>
                            <Input
                                id="confirmation"
                                value={confirmationText}
                                onChange={(e) => {
                                    setConfirmationText(e.target.value);
                                    setError('');
                                }}
                                placeholder={`Type "${entityName}" here`}
                                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 focus:border-red-500"
                                disabled={isDeleting}
                            />
                            {error && <p className="text-sm text-red-400">{error}</p>}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isDeleting}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isDeleting || isConfirmDisabled}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isDeleting ? (
                            <>
                                <span className="animate-spin mr-2">⏳</span>
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
