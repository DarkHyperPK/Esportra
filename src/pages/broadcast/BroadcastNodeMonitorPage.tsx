import React from 'react';
import { useParams } from 'react-router-dom';
import { MonitorSpeaker } from 'lucide-react';
import { toast } from 'sonner';
import {
  CommandShell, CommandPageGrid, CommandHeader, CommandSection,
  CommandButton, CommandEmptyState, CommandShowHeader,
} from '@/components/management/CommandSurface';
import { NodeCard } from '@/components/broadcast/NodeCard';
import { useMyOrganizationId } from '@/hooks/useMyOrganizationId';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useBroadcastShow } from '@/hooks/useBroadcastShow';
import { useBroadcastNodes, useSendNodeCommand } from '@/hooks/useBroadcastNodes';
import { useNow } from '@/hooks/useNow';
import { getApiErrorMessage } from '@/lib/apiClient';

export default function BroadcastNodeMonitorPage() {
  const { showId = '' } = useParams<{ showId: string }>();
  const orgId = useMyOrganizationId();
  const reduceMotion = useReducedMotion();

  const { data: show } = useBroadcastShow(showId);
  const { data: nodes = [], isLoading } = useBroadcastNodes(orgId);
  const commandMutation = useSendNodeCommand();
  const nowMs = useNow(5_000);
  const now = new Date(nowMs);

  const showTitle = show?.title ?? '…';
  const showStatus = show?.status === 'scheduled' ? 'draft' : (show?.status ?? 'draft');

  async function handleHold(nodeId: string, nodeName: string) {
    try {
      await commandMutation.mutateAsync({ nodeId, command: 'hold' });
      toast.success(`Hold sent to ${nodeName}.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Command failed. Check node connection.'));
    }
  }

  async function handleTake(nodeId: string, nodeName: string) {
    try {
      await commandMutation.mutateAsync({ nodeId, command: 'take' });
      toast.success(`Take sent to ${nodeName}.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Command failed. Check node connection.'));
    }
  }

  return (
    <CommandShell>
      <CommandShowHeader
        showTitle={showTitle}
        showStatus={showStatus as 'draft' | 'live' | 'ended'}
        backHref={`/broadcast/shows/${showId}`}
        backLabel="Back to show"
      />

      <CommandPageGrid>
        <CommandHeader
          eyebrow={`BROADCAST · ${showTitle.toUpperCase()}`}
          title="Node monitor"
          actions={
            <CommandButton variant="ghost" size="sm" asChild>
              <a href="https://docs.esportra.gg/air/pair-node" target="_blank" rel="noopener noreferrer">
                Pair node
              </a>
            </CommandButton>
          }
        />

        <CommandSection className="p-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-32 animate-pulse bg-white/[0.03]" />
              ))}
            </div>
          ) : nodes.length === 0 ? (
            <CommandEmptyState
              icon={<MonitorSpeaker className="h-6 w-6" />}
              title="No nodes paired"
              description="Pair a node from the Esportra Air desktop app."
              action={
                <CommandButton variant="ghost" size="sm" asChild>
                  <a href="https://docs.esportra.gg/air/pair-node" target="_blank" rel="noopener noreferrer">
                    How to pair a node
                  </a>
                </CommandButton>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {nodes.map((node, i) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  now={now}
                  index={i}
                  reduceMotion={reduceMotion}
                  onHold={() => handleHold(node.id, node.name)}
                  onTake={() => handleTake(node.id, node.name)}
                />
              ))}
            </div>
          )}
        </CommandSection>
      </CommandPageGrid>
    </CommandShell>
  );
}
