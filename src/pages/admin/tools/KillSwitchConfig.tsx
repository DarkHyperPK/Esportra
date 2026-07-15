import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Lock, RefreshCw, ShieldAlert, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
    <div className="min-h-screen p-4 lg:p-8">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10">
            <ShieldAlert className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h1 className="font-[Poppins] text-2xl font-black tracking-tight text-white lg:text-3xl">
              Kill Switch & Global Config
            </h1>
            <p className="text-sm text-zinc-500">
              Emergency platform controls backed by immutable operations audit.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => refetch()}
          className="border-zinc-800 text-zinc-400 hover:text-white"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </motion.header>

      {!canToggleKillSwitch && (
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-200">Limited Operations View</p>
              <p className="mt-1 text-xs text-zinc-400">
                You can inspect non-sensitive config if permitted, but emergency kill-switch action nodes are not rendered for your role.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0c] p-8 text-center text-zinc-500">
          Loading operations config…
        </div>
      ) : (
        <div className="space-y-8">
          {canToggleKillSwitch && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
                  Emergency Kill Switches
                </h2>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {killSwitches.map((item) => {
                  const enabled = asBoolean(item.value);
                  const reason = reasonByKey[item.key] ?? '';
                  const reasonValid = reason.trim().length >= 10;
                  return (
                    <motion.div
                      key={item.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl border p-5 ${
                        enabled
                          ? 'border-red-500/30 bg-red-500/10'
                          : 'border-zinc-800/60 bg-[#0a0a0c]'
                      }`}
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">{item.label}</h3>
                            <Badge className={enabled ? 'bg-red-500/20 text-red-200' : 'bg-zinc-800 text-zinc-400'}>
                              {enabled ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">{item.description}</p>
                          <p className="mt-2 font-mono text-[11px] text-zinc-600">{item.key}</p>
                        </div>
                        {enabled ? <ToggleRight className="h-6 w-6 text-red-300" /> : <ToggleLeft className="h-6 w-6 text-zinc-600" />}
                      </div>
                      <Textarea
                        value={reason}
                        onChange={(event) => updateReason(item.key, event.target.value)}
                        placeholder="Required: explain why this emergency control is changing"
                        className="mb-3 resize-none border-zinc-800 bg-zinc-950 text-white"
                        rows={3}
                      />
                      <Button
                        onClick={() => toggle(item)}
                        disabled={!reasonValid || updateConfig.isPending}
                        className={enabled ? 'bg-zinc-100 text-zinc-950 hover:bg-white' : 'bg-red-600 text-white hover:bg-red-700'}
                      >
                        {enabled ? 'Deactivate Kill Switch' : 'Activate Kill Switch'}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
              Global Config
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {standardConfig.map((item) => (
                <div key={item.key} className="rounded-2xl border border-zinc-800/60 bg-[#0a0a0c] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{item.label}</h3>
                      <p className="mt-1 text-xs text-zinc-500">{item.description}</p>
                      <p className="mt-2 font-mono text-[11px] text-zinc-600">{item.key}</p>
                    </div>
                    <Badge className="bg-zinc-800 text-zinc-400">{String(item.value)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
