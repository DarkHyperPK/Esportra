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
              regain access. Local capture, OBS and the rundown must be stopped
              on the workstation separately.
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
