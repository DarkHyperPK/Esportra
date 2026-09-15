import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CommandButton,
  CommandPanel,
} from '@/components/management/CommandSurface';
import { type RotateKeyResponse, useRotateDeveloperKey } from '@/hooks/useDeveloperApi';
import { OneTimeKeyRevealModal } from './OneTimeKeyRevealModal';

const GRACE_PERIOD_OPTIONS = [
  { label: '1 hour', value: 1 },
  { label: '6 hours', value: 6 },
  { label: '24 hours (default)', value: 24 },
  { label: '7 days', value: 168 },
];

interface RotateKeyDialogProps {
  keyId: string;
  keyName: string;
  keyPrefix: string;
  environment: 'sandbox' | 'live';
  onOpenChange: (open: boolean) => void;
}

export function RotateKeyDialog({
  keyId,
  keyName,
  keyPrefix,
  environment,
  onOpenChange,
}: RotateKeyDialogProps) {
  const [gracePeriodHours, setGracePeriodHours] = useState(24);
  const [rotatedKeyData, setRotatedKeyData] = useState<RotateKeyResponse | null>(null);

  const rotateMutation = useRotateDeveloperKey((data: RotateKeyResponse) => {
    setRotatedKeyData(data);
  });

  const handleRotate = () => {
    rotateMutation.mutate({ keyId, gracePeriodHours });
  };

  const handleRevealClose = () => {
    setRotatedKeyData(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent className="border-amber-500/35 sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Rotate API Key</DialogTitle>
            <DialogDescription>
              Generate a new key. The current key remains valid during the grace period.
            </DialogDescription>
          </DialogHeader>

          {/* Current key */}
          <CommandPanel>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Current Key
            </p>
            <p className="font-mono text-sm text-white tracking-widest">{keyPrefix}</p>
            <p className="mt-1 text-xs text-zinc-500">{keyName}</p>
          </CommandPanel>

          {/* Warning */}
          <CommandPanel className="border-amber-500/35 bg-amber-950/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="space-y-1 text-sm text-amber-200">
                <p className="font-semibold">How rotation works</p>
                <ul className="space-y-1 text-xs text-amber-300/80">
                  <li>A new key is generated and shown to you once.</li>
                  <li>The current key continues to work during the grace period.</li>
                  <li>After the grace period, the old key is automatically revoked.</li>
                  <li>Update your integrations before the grace period ends.</li>
                </ul>
              </div>
            </div>
          </CommandPanel>

          {/* Grace period */}
          <div className="space-y-2">
            <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Grace Period
            </Label>
            <Select
              value={String(gracePeriodHours)}
              onValueChange={(v) => setGracePeriodHours(Number(v))}
            >
              <SelectTrigger className="w-52 rounded-none border-white/10 bg-[#0a0a0c] text-white focus:ring-rose-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none border-white/10 bg-[#0a0a0c] text-white">
                {GRACE_PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <CommandButton variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </CommandButton>
            <CommandButton
              variant="warning"
              onClick={handleRotate}
              disabled={rotateMutation.isPending}
            >
              {rotateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Rotate Key
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rotatedKeyData && (
        <OneTimeKeyRevealModal
          rawKey={rotatedKeyData.key}
          keyName={keyName}
          environment={environment}
          onClose={handleRevealClose}
        />
      )}
    </>
  );
}
