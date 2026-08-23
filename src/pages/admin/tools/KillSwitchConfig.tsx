import { useMemo, useState } from 'react';
import { AlertTriangle, Lock, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandPanel,
  CommandSection,
} from '@/components/management/CommandSurface';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import {
  useOperationsSystemConfig,
  useUpdateOperationsSystemConfig,
  type OperationsSystemConfig,
} from '@/hooks/useAdminQueries';

function asBoolean(value: OperationsSystemConfig['value']): boolean {
  return value === true || value === 'true';
}

export default function KillSwitchConfig() {
  const { can } = useAdminAccess();
  const canToggleKillSwitch = can('system:kill-switch');
  const { data = [], isLoading, refetch } = useOperationsSystemConfig();
  const updateConfig = useUpdateOperationsSystemConfig();
  const [reasonByKey, setReasonByKey] = useState<Record<string, string>>({});

  const killSwitches = useMemo(() => data.filter((item) => item.is_kill_switch), [data]);
  const standardConfig = useMemo(() => data.filter((item) => !item.is_kill_switch), [data]);

  const updateReason = (key: string, reason: string) => {
    setReasonByKey((current) => ({ ...current, [key]: reason }));
  };

  const toggle = (item: OperationsSystemConfig) => {
    const reason = reasonByKey[item.key]?.trim();
    if (!reason || reason.length < 10) return;
    updateConfig.mutate({
      key: item.key,
      value: !asBoolean(item.value),
      reason,
    });
  };

  return (
    <AdminPage
      eyebrow="System"
      title="Kill Switches"
      description="Emergency platform controls backed by immutable operations audit."
      actions={
        <CommandButton variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </CommandButton>
      }
    >
      {!canToggleKillSwitch && (
        <div className="flex items-start gap-3 border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300">
              Limited Operations View
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              You can inspect non-sensitive config if permitted, but emergency kill-switch action nodes are not rendered for your role.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <CommandSection className="py-16 text-center text-sm text-zinc-500">
          Loading operations config…
        </CommandSection>
      ) : (
        <div className="space-y-6">
          {canToggleKillSwitch && (
            <CommandSection>
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-300" />
                <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                  Emergency Kill Switches
                </h2>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {killSwitches.map((item) => {
                  const enabled = asBoolean(item.value);
                  const reason = reasonByKey[item.key] ?? '';
                  const reasonValid = reason.trim().length >= 10;
                  return (
                    <div
                      key={item.key}
                      className={
                        enabled
                          ? 'border border-rose-500/30 bg-rose-500/[0.03] p-4'
                          : 'border border-white/10 bg-white/[0.025] p-4'
                      }
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">{item.label}</h3>
                            <span
                              className={`border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                                enabled ? 'border-rose-500/30 text-rose-300' : 'border-white/15 text-zinc-400'
                              }`}
                            >
                              {enabled ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">{item.description}</p>
                          <p className="mt-2 font-mono text-[11px] text-zinc-600">{item.key}</p>
                        </div>
                        {enabled ? (
                          <ToggleRight className="h-5 w-5 shrink-0 text-rose-400" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 shrink-0 text-zinc-600" />
                        )}
                      </div>
                      <Textarea
                        value={reason}
                        onChange={(event) => updateReason(item.key, event.target.value)}
                        placeholder="Required: explain why this emergency control is changing"
                        className="mb-3 resize-none rounded-none border-white/10 bg-black/40 text-white placeholder:text-zinc-600"
                        rows={3}
                      />
                      <CommandButton
                        variant={enabled ? 'secondary' : 'danger'}
                        size="sm"
                        onClick={() => toggle(item)}
                        disabled={!reasonValid || updateConfig.isPending}
                      >
                        {enabled ? 'Deactivate Kill Switch' : 'Activate Kill Switch'}
                      </CommandButton>
                    </div>
                  );
                })}
              </div>
            </CommandSection>
          )}

          <CommandSection>
            <h2 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
              Global Config
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {standardConfig.map((item) => (
                <CommandPanel key={item.key}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{item.label}</h3>
                      <p className="mt-1 text-xs text-zinc-500">{item.description}</p>
                      <p className="mt-2 font-mono text-[11px] text-zinc-600">{item.key}</p>
                    </div>
                    <span className="shrink-0 border border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {String(item.value)}
                    </span>
                  </div>
                </CommandPanel>
              ))}
            </div>
          </CommandSection>
        </div>
      )}
    </AdminPage>
  );
}
