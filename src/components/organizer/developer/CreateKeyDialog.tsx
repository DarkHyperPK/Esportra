import { useState } from 'react';
import { Loader2, Shield } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  CommandButton,
  CommandPanel,
  CommandSegmentedButton,
} from '@/components/management/CommandSurface';
import {
  type CreateKeyResponse,
  useCreateDeveloperKey,
} from '@/hooks/useDeveloperApi';
import { OneTimeKeyRevealModal } from './OneTimeKeyRevealModal';

const SCOPES: { value: string; label: string; description: string }[] = [
  { value: 'tournaments:read', label: 'tournaments:read', description: 'Read tournament data, brackets, and participants' },
  { value: 'tournaments:write', label: 'tournaments:write', description: 'Create and manage tournaments' },
  { value: 'brackets:read', label: 'brackets:read', description: 'Read bracket structure and match data' },
  { value: 'brackets:write', label: 'brackets:write', description: 'Create and update brackets' },
  { value: 'matches:read', label: 'matches:read', description: 'Read match results and details' },
  { value: 'matches:write', label: 'matches:write', description: 'Update match outcomes and scores' },
  { value: 'veto:read', label: 'veto:read', description: 'Read map veto sequences' },
  { value: 'veto:write', label: 'veto:write', description: 'Submit veto picks and bans' },
];

const textInput = 'rounded-none border-white/10 bg-[#0a0a0c] text-white placeholder:text-zinc-600 focus:border-rose-500';

interface CreateKeyDialogProps {
  orgId: string;
  isApiApproved: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateKeyDialog({ orgId, isApiApproved, onOpenChange }: CreateKeyDialogProps) {
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<'sandbox' | 'live'>('sandbox');
  const [scopes, setScopes] = useState<string[]>(SCOPES.map((s) => s.value));
  const [rateLimit, setRateLimit] = useState(60);
  const [nameError, setNameError] = useState('');
  const [createdKeyData, setCreatedKeyData] = useState<CreateKeyResponse | null>(null);

  const createMutation = useCreateDeveloperKey(orgId, (data: CreateKeyResponse) => {
    setCreatedKeyData(data);
  });

  const handleScopeToggle = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setNameError('Key name is required.');
      return;
    }
    if (scopes.length === 0) {
      return;
    }
    const clampedRate = Math.min(300, Math.max(1, rateLimit));
    createMutation.mutate({
      name: name.trim(),
      environment,
      scopes,
      rate_limit_per_min: clampedRate,
    });
  };

  const handleRevealClose = () => {
    setCreatedKeyData(null);
    onOpenChange(false);
  };

  const rateLimitValid = rateLimit >= 1 && rateLimit <= 300;
  const canSubmit = name.trim().length > 0 && scopes.length > 0 && rateLimitValid;

  return (
    <>
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Configure your new API key. Scopes and rate limits cannot be changed after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Key Name <span className="text-rose-400">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(''); }}
                placeholder="e.g., Production Server, Staging Bot"
                className={textInput}
              />
              {nameError && <p className="text-xs text-rose-400">{nameError}</p>}
            </div>

            {/* Environment */}
            <div className="space-y-2">
              <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Environment
              </Label>
              <div className="flex gap-2">
                <CommandSegmentedButton
                  active={environment === 'sandbox'}
                  onClick={() => setEnvironment('sandbox')}
                >
                  Sandbox
                </CommandSegmentedButton>
                <CommandSegmentedButton
                  active={environment === 'live'}
                  onClick={() => { if (isApiApproved) setEnvironment('live'); }}
                  disabled={!isApiApproved}
                >
                  {!isApiApproved && <Shield className="mr-1 h-3 w-3" />}
                  Live
                </CommandSegmentedButton>
              </div>
              {!isApiApproved && (
                <p className="text-xs text-zinc-500">Live access requires API approval. Apply below.</p>
              )}
            </div>

            {/* Scopes */}
            <div className="space-y-2">
              <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Scopes
              </Label>
              <CommandPanel className="p-3">
                <div className="grid gap-3 md:grid-cols-2">
                  {SCOPES.map((scope) => (
                    <div key={scope.value} className="flex items-start gap-2">
                      <Checkbox
                        id={`scope-${scope.value}`}
                        checked={scopes.includes(scope.value)}
                        onCheckedChange={() => handleScopeToggle(scope.value)}
                        className="mt-0.5"
                      />
                      <label htmlFor={`scope-${scope.value}`} className="cursor-pointer space-y-0.5">
                        <p className="font-mono text-[11px] text-white">{scope.label}</p>
                        <p className="text-[10px] text-zinc-500">{scope.description}</p>
                      </label>
                    </div>
                  ))}
                </div>
                {scopes.length === 0 && (
                  <p className="mt-2 text-xs text-rose-400">At least one scope is required.</p>
                )}
              </CommandPanel>
            </div>

            {/* Rate limit */}
            <div className="space-y-2">
              <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Rate Limit (requests / minute)
              </Label>
              <Input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(Number(e.target.value))}
                min={1}
                max={300}
                className={`${textInput} w-32`}
              />
              {!rateLimitValid && (
                <p className="text-xs text-rose-400">Must be between 1 and 300.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <CommandButton variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </CommandButton>
            <CommandButton onClick={handleSubmit} disabled={!canSubmit || createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Create Key
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Raw key modal — mounts only while createdKeyData is non-null */}
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
