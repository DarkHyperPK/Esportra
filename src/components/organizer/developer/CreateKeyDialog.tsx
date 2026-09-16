import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CommandButton } from '@/components/management/CommandSurface';
import {
  type CreateKeyResponse,
  useCreateDeveloperKey,
} from '@/hooks/useDeveloperApi';
import { OneTimeKeyRevealModal } from './OneTimeKeyRevealModal';

const textInput = 'rounded-none border-white/10 bg-[#0a0a0c] text-white placeholder:text-zinc-600 focus:border-rose-500';

interface CreateKeyDialogProps {
  orgId: string;
  environment: 'sandbox' | 'live';
  onOpenChange: (open: boolean) => void;
}

export function CreateKeyDialog({ orgId, environment, onOpenChange }: CreateKeyDialogProps) {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [createdKeyData, setCreatedKeyData] = useState<CreateKeyResponse | null>(null);

  const createMutation = useCreateDeveloperKey(orgId, (data: CreateKeyResponse) => {
    setCreatedKeyData(data);
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      setNameError('Key name is required.');
      return;
    }
    createMutation.mutate({ name: name.trim(), environment, rate_limit_per_min: 60 });
  };

  const handleRevealClose = () => {
    setCreatedKeyData(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Give this key a name so you can identify it later. It will have full API access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Key Name <span className="text-rose-400">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              placeholder="e.g., Production Server, CI Bot"
              className={textInput}
            />
            {nameError && <p className="text-xs text-rose-400">{nameError}</p>}
          </div>

          <DialogFooter>
            <CommandButton variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </CommandButton>
            <CommandButton
              onClick={handleSubmit}
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Key
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {createdKeyData && (
        <OneTimeKeyRevealModal
          rawKey={createdKeyData.key}
          keyName={createdKeyData.name}
          environment={createdKeyData.environment}
          onClose={handleRevealClose}
        />
      )}
    </>
  );
}
