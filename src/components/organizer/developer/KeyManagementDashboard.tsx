import { useState } from 'react';
import { Key, Loader2, Plus } from 'lucide-react';
import {
  CommandButton,
  CommandEmptyState,
  CommandPanel,
  CommandSection,
} from '@/components/management/CommandSurface';
import { type DevAccessRequest, type DeveloperKey } from '@/hooks/useDeveloperApi';
import { KeyTable } from './KeyTable';
import { CreateKeyDialog } from './CreateKeyDialog';
import { LiveAccessLockedPanel } from './LiveAccessLockedPanel';
import { PendingReviewPanel } from './PendingReviewPanel';

const SANDBOX_LIMIT = 5;
const LIVE_LIMIT = 3;

interface KeyManagementDashboardProps {
  orgId: string;
  isApiApproved: boolean;
  accessRequest: DevAccessRequest | null | undefined;
  keys: DeveloperKey[];
  isLoading: boolean;
}

function KeyLimitIndicator({ used, total }: { used: number; total: number }) {
  const atLimit = used >= total;
  return (
    <span
      className={`font-mono text-[10px] font-bold ${atLimit ? 'text-rose-400' : 'text-zinc-500'}`}
    >
      {used} / {total} keys used
    </span>
  );
}

export function KeyManagementDashboard({
  orgId,
  isApiApproved,
  accessRequest,
  keys,
  isLoading,
}: KeyManagementDashboardProps) {
  const [createDialogEnv, setCreateDialogEnv] = useState<'sandbox' | 'live' | null>(null);

  const sandboxKeys = keys.filter((k) => k.environment === 'sandbox' && k.status !== 'revoked');
  const liveKeys = keys.filter((k) => k.environment === 'live' && k.status !== 'revoked');
  const sandboxAtLimit = sandboxKeys.length >= SANDBOX_LIMIT;
  const liveAtLimit = liveKeys.length >= LIVE_LIMIT;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
        Loading keys…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sandbox section */}
      <CommandSection>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">
                Sandbox Environment
              </p>
              <div className="mt-1 flex items-center gap-3">
                <span className="border border-blue-500/35 bg-blue-950/20 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-blue-300">
                  Testing
                </span>
                <KeyLimitIndicator used={sandboxKeys.length} total={SANDBOX_LIMIT} />
              </div>
            </div>
          </div>
          <CommandButton
            size="sm"
            onClick={() => setCreateDialogEnv('sandbox')}
            disabled={sandboxAtLimit}
          >
            <Plus className="h-4 w-4" />
            Create Key
          </CommandButton>
        </div>
        {sandboxAtLimit && (
          <CommandPanel className="mt-4 border-amber-500/25 bg-amber-950/10">
            <p className="text-sm text-amber-300">
              Sandbox key limit reached ({SANDBOX_LIMIT}). Revoke an existing key to create another.
            </p>
          </CommandPanel>
        )}
        <div className="mt-4">
          <KeyTable
            keys={keys.filter((k) => k.environment === 'sandbox')}
            emptyMessage="No sandbox keys yet."
          />
        </div>
      </CommandSection>

      {/* Live section */}
      <CommandSection>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">
              Live Environment
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span className="border border-emerald-500/35 bg-emerald-950/20 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                Production
              </span>
              {isApiApproved && (
                <KeyLimitIndicator used={liveKeys.length} total={LIVE_LIMIT} />
              )}
            </div>
          </div>
          {isApiApproved && (
            <CommandButton
              size="sm"
              onClick={() => setCreateDialogEnv('live')}
              disabled={liveAtLimit}
            >
              <Plus className="h-4 w-4" />
              Create Key
            </CommandButton>
          )}
        </div>

        <div className="mt-4">
          {!isApiApproved && !accessRequest && <LiveAccessLockedPanel orgId={orgId} />}
          {!isApiApproved && accessRequest?.status === 'pending' && (
            <PendingReviewPanel accessRequest={accessRequest} />
          )}
          {!isApiApproved && accessRequest?.status === 'rejected' && (
            <CommandPanel className="border-red-500/25 bg-red-950/10">
              <p className="text-sm text-red-300">
                Your application was not approved.
                {accessRequest.admin_notes && (
                  <span className="ml-1 text-zinc-400">{accessRequest.admin_notes}</span>
                )}
              </p>
            </CommandPanel>
          )}
          {isApiApproved && liveAtLimit && (
            <CommandPanel className="mb-4 border-amber-500/25 bg-amber-950/10">
              <p className="text-sm text-amber-300">
                Live key limit reached ({LIVE_LIMIT}). Revoke an existing key to create another.
              </p>
            </CommandPanel>
          )}
          {isApiApproved && (
            <KeyTable
              keys={keys.filter((k) => k.environment === 'live')}
              emptyMessage="No live keys yet."
            />
          )}
        </div>
      </CommandSection>

      {/* Empty state for no keys at all */}
      {keys.length === 0 && !isLoading && (
        <CommandEmptyState
          title="No API keys"
          description="Create your first sandbox key to start exploring the API."
          icon={<Key className="h-5 w-5" />}
        />
      )}

      {createDialogEnv && (
        <CreateKeyDialog
          orgId={orgId}
          environment={createDialogEnv}
          onOpenChange={(open) => { if (!open) setCreateDialogEnv(null); }}
        />
      )}
    </div>
  );
}
