import { useState } from "react";
import {
  CommandButton,
  CommandSection,
} from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BroadcastNode } from "@/types/broadcast";
import {
  classifyNodeHealth,
  relativeLastSeen,
} from "@/services/broadcast/broadcastNodeRules";
import { getApiErrorMessage } from "@/lib/apiClient";
import { nodeRuntimeHealth } from "@/services/broadcast/nodeRuntimeHealth";

export function NodeCard({
  node,
  now,
  onDeactivate,
}: {
  node: BroadcastNode;
  now: Date;
  onDeactivate: () => Promise<unknown>;
}) {
  const health = classifyNodeHealth(node.lastSeenAt, now);
  const runtime = nodeRuntimeHealth(node, now);
  const [confirming, setConfirming] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function deactivate() {
    setPending(true);
    setError(null);
    try {
      await onDeactivate();
      setConfirming(false);
    } catch (failure) {
      setError(
        getApiErrorMessage(failure, "Could not revoke this node. Try again."),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <CommandSection>
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{node.name}</h2>
        <span
          className={
            health === "online" ? "text-emerald-400" : "text-amber-400"
          }
        >
          {health === "online"
            ? "Heartbeat online"
            : health === "stale"
              ? "Heartbeat stale"
              : "Offline"}
        </span>
      </div>
      <p className="mt-4 text-sm text-zinc-400">
        Last seen: {relativeLastSeen(node.lastSeenAt, now)}
      </p>
      <p className="mt-2 break-all font-mono text-xs text-zinc-600">
        {node.id}
      </p>
      <p className="my-4 text-xs text-zinc-500">
        Check capture, OBS and browser outputs on this workstation.
      </p>
      {runtime && <div className="my-4 space-y-2 text-xs text-zinc-400" aria-label="Reported production health">
        <p>{runtime.mode === "capture-only" ? "Capture node" : "Production node"} · Local HUD {runtime.hudOnline ? "online" : "offline"} · OBS {runtime.obsConnected ? "connected" : "disconnected"}</p>
        <p>Game feed: {runtime.feedState} · {runtime.timeoutPaused ? "Team timeout" : runtime.automationPaused ? "Technical pause" : runtime.obsConnected ? "OBS ready" : "OBS connection required"}</p>
        {runtime.plan && <p>Reported broadcast screens v{runtime.plan.version}{runtime.plan.pendingVersion ? ` · v${runtime.plan.pendingVersion} waiting for a segment boundary` : ''}</p>}
        {runtime.feedState === "stale" && <InlineNotice tone="critical">Game feed paused on this node. On-air values are last received; check the observer connection.</InlineNotice>}
        {runtime.mode === "production" && !runtime.obsConnected && <InlineNotice tone="warning">OBS disconnected. Automatic takes stay paused until the node reconnects.</InlineNotice>}
      </div>}
      <CommandButton
        variant="danger"
        size="sm"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
      >
        Revoke node access
      </CommandButton>
      {!!runtime?.outputs?.length && <details className="my-4 text-xs text-zinc-400"><summary>Browser output health · {runtime.outputs.length} sources</summary><ul className="mt-3 space-y-2">{runtime.outputs.map(output => <li key={output.id}><strong className="text-zinc-200">{output.name}</strong> · {output.connectionCount} connected · {output.lastFrameAt ? `Last rendered ${relativeLastSeen(output.lastFrameAt, now)}` : 'Waiting for render'}</li>)}</ul></details>}
      <AlertDialog
        open={confirming}
        onOpenChange={(value) => {
          if (!pending) setConfirming(value);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {node.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Stops this node's platform access. It must pair with a new code to
              regain access. Updated Air apps stop capture and pause automatic
              production after detecting revocation. OBS keeps its current program;
              stop the stream in OBS if needed. Older apps require local capture
              and broadcast screens controls to be stopped separately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <InlineNotice tone="critical">{error}</InlineNotice>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep node</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className="rounded-none border-red-500/35 bg-red-950/20 text-red-100"
              onClick={(event) => {
                event.preventDefault();
                void deactivate();
              }}
            >
              {pending ? "Revoking…" : "Revoke access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CommandSection>
  );
}
