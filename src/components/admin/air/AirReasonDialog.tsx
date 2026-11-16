import { useEffect, useState } from 'react';
import { CommandButton } from '@/components/management/CommandSurface';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { errorText, fieldClass } from './airFormat';

interface AirReasonDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirm: string;
  onConfirm: (reason: string) => Promise<unknown>;
  onClose: () => void;
}

/** Asks for the reason an admin action needs (decline, revoke); the reason goes to Activity. */
export function AirReasonDialog({ open, title, description, confirm, onConfirm, onClose }: AirReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setReason(''); setError(''); }
  }, [open]);

  async function submit() {
    if (!reason.trim()) return setError('Write a reason.');
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (e) {
      setError(errorText(e, 'That did not work. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-none border border-white/10 bg-[#111114] p-6">
        <DialogTitle className="text-lg font-semibold text-white">{title}</DialogTitle>
        <DialogDescription className="text-sm text-zinc-400">{description}</DialogDescription>
        <textarea
          className={`${fieldClass} mt-3 min-h-[96px]`}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label="Reason"
          autoFocus
        />
        {error ? <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <CommandButton variant="ghost" size="sm" onClick={onClose}>Cancel</CommandButton>
          <CommandButton variant="danger" size="sm" disabled={busy} onClick={submit}>{confirm}</CommandButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
