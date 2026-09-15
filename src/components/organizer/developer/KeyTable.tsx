import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { RotateCw, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  CommandEmptyState,
  CommandIconButton,
  CommandPanel,
} from '@/components/management/CommandSurface';
import { type DeveloperKey, useRenameDeveloperKey } from '@/hooks/useDeveloperApi';
import { RotateKeyDialog } from './RotateKeyDialog';
import { RevokeKeyDialog } from './RevokeKeyDialog';
import { cn } from '@/lib/utils';

interface KeyTableProps {
  keys: DeveloperKey[];
  emptyMessage?: string;
}

function envBadgeClass(env: DeveloperKey['environment']) {
  return env === 'live'
    ? 'border-emerald-500/35 bg-emerald-950/20 text-emerald-300'
    : 'border-blue-500/35 bg-blue-950/20 text-blue-300';
}

function statusBadgeClass(status: DeveloperKey['status']) {
  if (status === 'rotating') return 'border-amber-500/35 bg-amber-950/20 text-amber-300';
  if (status === 'revoked') return 'border-red-500/35 bg-red-950/20 text-red-300';
  return 'border-emerald-500/35 bg-emerald-950/20 text-emerald-300';
}

interface InlineNameEditorProps {
  keyId: string;
  currentName: string;
}

function InlineNameEditor({ keyId, currentName }: InlineNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentName);
  const renameMutation = useRenameDeveloperKey();

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== currentName) {
      renameMutation.mutate({ keyId, name: trimmed });
    } else {
      setValue(currentName);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { setValue(currentName); setEditing(false); }
  };

  if (editing) {
    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        autoFocus
        className="h-7 rounded-none border-white/10 bg-[#0a0a0c] px-2 text-sm text-white focus:border-rose-500"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="max-w-[180px] truncate text-left text-sm text-white hover:underline hover:underline-offset-2"
      title="Click to rename"
    >
      {currentName}
    </button>
  );
}

export function KeyTable({ keys, emptyMessage = 'No keys yet.' }: KeyTableProps) {
  const [rotatingKey, setRotatingKey] = useState<DeveloperKey | null>(null);
  const [revokingKey, setRevokingKey] = useState<DeveloperKey | null>(null);

  if (keys.length === 0) {
    return (
      <CommandEmptyState
        title={emptyMessage}
        description="Create a key to start making API calls."
      />
    );
  }

  return (
    <>
      {/* Column headers */}
      <div className="hidden grid-cols-[200px_160px_90px_90px_130px_130px_80px] gap-4 border border-white/5 bg-white/[0.01] px-4 py-2 lg:grid">
        {['Name', 'Key Prefix', 'Env', 'Status', 'Last Used', 'Created', 'Actions'].map((h) => (
          <span key={h} className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600">
            {h}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        {keys.map((key) => (
          <CommandPanel key={key.id} className="p-3">
            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[200px_160px_90px_90px_130px_130px_80px] lg:items-center lg:gap-4">
              {/* Name */}
              <div>
                <InlineNameEditor keyId={key.id} currentName={key.name} />
              </div>

              {/* Prefix */}
              <div>
                <span className="font-mono text-sm tracking-widest text-white">
                  {key.key_prefix}
                </span>
              </div>

              {/* Env badge */}
              <div>
                <span
                  className={cn(
                    'inline-flex items-center border px-2 py-1 font-mono text-[10px] uppercase tracking-wider',
                    envBadgeClass(key.environment),
                  )}
                >
                  {key.environment}
                </span>
              </div>

              {/* Status badge */}
              <div>
                <span
                  className={cn(
                    'inline-flex items-center border px-2 py-1 font-mono text-[10px] uppercase tracking-wider',
                    statusBadgeClass(key.status),
                  )}
                >
                  {key.status}
                </span>
                {key.status === 'rotating' && key.grace_period_until && (
                  <p className="mt-1 font-mono text-[10px] text-amber-400">
                    Expires{' '}
                    {formatDistanceToNow(new Date(key.grace_period_until), { addSuffix: true })}
                  </p>
                )}
              </div>

              {/* Last used */}
              <div>
                <p className="text-xs text-zinc-500">
                  {key.last_used_at
                    ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })
                    : 'Never'}
                </p>
              </div>

              {/* Created */}
              <div>
                <p className="text-xs text-zinc-500">
                  {formatDistanceToNow(new Date(key.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {key.status !== 'revoked' && (
                  <>
                    <CommandIconButton
                      label="Rotate key"
                      variant="warning"
                      onClick={() => setRotatingKey(key)}
                    >
                      <RotateCw />
                    </CommandIconButton>
                    <CommandIconButton
                      label="Revoke key"
                      variant="danger"
                      onClick={() => setRevokingKey(key)}
                    >
                      <Trash2 />
                    </CommandIconButton>
                  </>
                )}
              </div>
            </div>
          </CommandPanel>
        ))}
      </div>

      {rotatingKey && (
        <RotateKeyDialog
          keyId={rotatingKey.id}
          keyName={rotatingKey.name}
          keyPrefix={rotatingKey.key_prefix}
          environment={rotatingKey.environment}
          onOpenChange={(open) => { if (!open) setRotatingKey(null); }}
        />
      )}

      {revokingKey && (
        <RevokeKeyDialog
          keyId={revokingKey.id}
          keyName={revokingKey.name}
          keyPrefix={revokingKey.key_prefix}
          onOpenChange={(open) => { if (!open) setRevokingKey(null); }}
        />
      )}
    </>
  );
}
