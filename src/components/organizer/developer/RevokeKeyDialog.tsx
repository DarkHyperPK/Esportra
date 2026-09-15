import { Loader2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CommandButton, CommandPanel } from '@/components/management/CommandSurface';
import { useRevokeDeveloperKey } from '@/hooks/useDeveloperApi';

interface RevokeKeyDialogProps {
  keyId: string;
  keyName: string;
  keyPrefix: string;
  onOpenChange: (open: boolean) => void;
}

export function RevokeKeyDialog({
  keyId,
  keyName,
  keyPrefix,
  onOpenChange,
}: RevokeKeyDialogProps) {
  const revokeMutation = useRevokeDeveloperKey();

  const handleRevoke = () => {
    revokeMutation.mutate(keyId, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="border-red-500/35 sm:max-w-[440px]">
        {/* Red accent bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-700 to-red-500" />

        <DialogHeader className="mt-2">
          <DialogTitle className="text-red-400">Revoke API Key?</DialogTitle>
        </DialogHeader>

        {/* Key details */}
        <CommandPanel className="text-center">
          <p className="font-mono text-sm font-bold tracking-widest text-white">{keyPrefix}</p>
          <p className="mt-1 text-sm text-zinc-400">{keyName}</p>
        </CommandPanel>

        {/* Warning */}
        <CommandPanel className="border-red-500/35 bg-red-950/10">
          <p className="mb-2 text-sm font-semibold text-red-200">This will immediately:</p>
          <ul className="space-y-1 text-xs text-red-300/80">
            <li>Invalidate all requests using this key</li>
            <li>Terminate any active webhook connections</li>
            <li>Remove the key permanently — this cannot be undone</li>
          </ul>
        </CommandPanel>

        <DialogFooter>
          <CommandButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </CommandButton>
          <CommandButton
            variant="danger"
            onClick={handleRevoke}
            disabled={revokeMutation.isPending}
          >
            {revokeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Revoke Key
          </CommandButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
