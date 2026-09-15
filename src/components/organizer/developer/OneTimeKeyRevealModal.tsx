import { useState } from 'react';
import { Check, Copy, ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CommandButton } from '@/components/management/CommandSurface';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface OneTimeKeyRevealModalProps {
  rawKey: string;
  keyName: string;
  environment: 'sandbox' | 'live';
  onClose: () => void;
}

/**
 * Displays the raw API key exactly once after creation or rotation.
 * Blocks all close attempts (ESC, outside click, X button) until the
 * user confirms they have saved the key. On close, parent clears rawKey
 * from state — the key is then unrecoverable by design.
 *
 * SECURITY: rawKey must only ever live in component-local useState.
 * It must never enter TanStack Query cache or any persistence layer.
 */
export function OneTimeKeyRevealModal({
  rawKey,
  keyName,
  environment,
  onClose,
}: OneTimeKeyRevealModalProps) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // Clipboard write failed silently — user can still select and copy manually
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && confirmed) {
      onClose();
    }
  };

  const envBadge =
    environment === 'live'
      ? 'border-emerald-500/35 bg-emerald-950/20 text-emerald-300'
      : 'border-blue-500/35 bg-blue-950/20 text-blue-300';

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[560px]"
        onInteractOutside={(e) => {
          if (!confirmed) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!confirmed) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>API Key Created</DialogTitle>
          <DialogDescription>
            Copy your key now — it will not be shown again.
          </DialogDescription>
        </DialogHeader>

        {/* Warning banner */}
        <div className="flex items-start gap-3 border border-rose-500/35 bg-rose-950/20 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <p className="text-sm text-rose-200">
            <strong>Copy your API key now.</strong> You will not be able to see it again.
            Store it securely — treat it like a password.
          </p>
        </div>

        {/* Key details */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">{keyName}</span>
          <span
            className={`inline-flex items-center border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${envBadge}`}
          >
            {environment}
          </span>
        </div>

        {/* Key display */}
        <div className="relative">
          <div className="break-all bg-black p-4 font-mono text-sm font-bold tracking-widest text-white">
            {rawKey}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center border border-white/10 bg-black/60 text-zinc-400 transition-colors hover:border-white/25 hover:text-white"
            title="Copy key"
            aria-label="Copy API key"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        {copied && (
          <p className="font-mono text-[11px] text-emerald-400">
            Copied to clipboard.
          </p>
        )}

        {/* Confirmation checkbox */}
        <div className="flex items-center gap-3 border border-white/10 bg-white/[0.025] p-4">
          <Checkbox
            id="key-saved-confirm"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
          />
          <Label
            htmlFor="key-saved-confirm"
            className="cursor-pointer text-sm text-zinc-300"
          >
            I have saved my API key in a secure location
          </Label>
        </div>

        {/* Footer */}
        <CommandButton
          onClick={onClose}
          disabled={!confirmed}
          className="w-full"
        >
          {confirmed ? "I've Saved My Key" : 'Save your key to continue'}
        </CommandButton>
      </DialogContent>
    </Dialog>
  );
}
