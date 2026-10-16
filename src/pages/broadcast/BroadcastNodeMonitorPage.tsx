import { BroadcastShell } from '@/components/broadcast/BroadcastShell';
import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  CommandPageGrid,
  CommandHeader,
  CommandSection,
  CommandButton,
  CommandShowHeader,
} from "@/components/management/CommandSurface";
import { PairNodeDialog } from "@/components/broadcast/PairNodeDialog";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { useBroadcastShow } from "@/hooks/useBroadcastShow";
import {
  useBroadcastNodes,
  useDeactivateBroadcastNode,
} from "@/hooks/useBroadcastNodes";
import { NodeCard } from "@/components/broadcast/NodeCard";
import { useNow } from "@/hooks/useNow";

export default function BroadcastNodeMonitorPage() {
  const { showId = "" } = useParams<{ showId: string }>();
  const show = useBroadcastShow(showId);
  const orgId = show.data?.orgId;
  const nodes = useBroadcastNodes(orgId),
    now = useNow(5000);
  const [pairing, setPairing] = useState(false);
  const deactivate = useDeactivateBroadcastNode(orgId);
  return (
    <BroadcastShell>
      <CommandShowHeader
        showTitle={show.data?.title || "Show"}
        showStatus={show.data?.status ?? "draft"}
        backHref={`/broadcast/shows/${showId}`}
        backLabel="Back to show"
      />
      <CommandPageGrid>
        <CommandHeader
          eyebrow="ESPORTRA AIR · CONNECTIONS"
          title="Desktop connections"
          description="Production computers paired to your organization. Check OBS and game capture in Air on that PC."
          actions={
            <CommandButton disabled={!orgId} onClick={() => setPairing(true)}>
              Pair desktop
            </CommandButton>
          }
        />
        {nodes.isLoading && (
          <p role="status" className="text-zinc-400">
            Loading desktop connections…
          </p>
        )}
        {nodes.isError && (
          <InlineNotice tone="critical">
            Could not load desktop connections.{" "}
            <button onClick={() => void nodes.refetch()}>Retry</button>
          </InlineNotice>
        )}
        {nodes.data?.length === 0 && (
          <CommandSection>
            <p className="text-zinc-400">
              No desktop paired. Generate a code and enter it in the desktop app.
            </p>
          </CommandSection>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {nodes.data?.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              now={new Date(now)}
              onDeactivate={() => deactivate.mutateAsync(node.id)}
            />
          ))}
        </div>
        {orgId && (
          <PairNodeDialog
            orgId={orgId}
            open={pairing}
            onOpenChange={setPairing}
          />
        )}
      </CommandPageGrid>
    </BroadcastShell>
  );
}
