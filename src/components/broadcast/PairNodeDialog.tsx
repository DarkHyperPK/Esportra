import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { useCreateNodePairingCode } from "@/hooks/useBroadcastPlanning";
import { useNow } from "@/hooks/useNow";
import { getApiErrorMessage } from "@/lib/apiClient";

export function PairNodeDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const create = useCreateNodePairingCode(),
    client = useQueryClient();
  const [copied, setCopied] = useState(false);
  const now = useNow(1000),
    code = create.data;
  const seconds = code
    ? Math.max(0, Math.ceil((Date.parse(code.expiresAt) - now) / 1000))
    : 0;
  function changeOpen(value: boolean) {
    if (!value) {
      create.reset();
      setCopied(false);
    }
    onOpenChange(value);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(code?.code || "");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pair a production node</DialogTitle>
          <DialogDescription>
            Generate a code here. Enter it in Esportra Air on the workstation.
          </DialogDescription>
        </DialogHeader>
        {create.isError && (
          <InlineNotice tone="critical">
            {getApiErrorMessage(
              create.error,
              "Could not create a pairing code.",
            )}
          </InlineNotice>
        )}
        {code && (
          <div className="border border-white/20 bg-black/30 p-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
              Temporary code
            </p>
            <p
              className={`my-4 border-b-2 border-rose-500 pb-3 font-display text-4xl font-black tracking-[.15em] ${!seconds ? "text-zinc-500 line-through" : "text-white"}`}
            >
              {code.code.slice(0, 4)} {code.code.slice(4)}
            </p>
            <p className="font-mono text-sm text-amber-300">
              {seconds
                ? `Expires in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
                : "Code expired"}
            </p>
          </div>
        )}
        <p className="text-sm text-zinc-400">
          After pairing on desktop, refresh the node list. Registration and
          heartbeat are separate checks.
        </p>
        <div className="flex flex-wrap gap-3">
          <CommandButton
            disabled={create.isPending}
            onClick={() => {
              setCopied(false);
              create.mutate(orgId);
            }}
          >
            {code ? "Generate new code" : "Generate code"}
          </CommandButton>
          {code && seconds > 0 && (
            <CommandButton variant="ghost" onClick={copy}>
              {copied ? "Copied" : "Copy code"}
            </CommandButton>
          )}
          <CommandButton
            variant="ghost"
            onClick={() => {
              void client.invalidateQueries({
                queryKey: ["broadcast-nodes", orgId],
              });
              void client.invalidateQueries({
                queryKey: ["broadcast-home", orgId],
              });
            }}
          >
            Refresh nodes
          </CommandButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
