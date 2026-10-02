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

type Props = {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    busyLabel: string;
    cancelLabel?: string;
    busy: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

/** One confirmation for the bracket's irreversible actions (delete, reset). */
export const ConfirmBracketActionDialog = ({
    open, title, description, confirmLabel, busyLabel, cancelLabel = 'Keep it', busy, onCancel, onConfirm,
}: Props) => (
    <AlertDialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
        <AlertDialogContent className="rounded-none border-white/10 bg-[#111114] text-white">
            <AlertDialogHeader>
                <AlertDialogTitle className="font-heading">{title}</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">{description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={busy} className="rounded-none border-white/10 bg-transparent text-white hover:bg-white/[0.06]">
                    {cancelLabel}
                </AlertDialogCancel>
                <AlertDialogAction
                    disabled={busy}
                    className="rounded-none bg-red-600 text-white hover:bg-red-500"
                    onClick={(event) => {
                        event.preventDefault();
                        onConfirm();
                    }}
                >
                    {busy ? busyLabel : confirmLabel}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);

export default ConfirmBracketActionDialog;
