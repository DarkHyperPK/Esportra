import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CommandButton } from '@/components/management/CommandSurface';
import { StatusPill } from '@/components/ui/kit/StatusPill';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { BroadcastNode } from '@/types/broadcast';
import {
  classifyNodeHealth,
  nodeNeedsAttention,
  relativeLastSeen,
} from '@/services/broadcast/broadcastNodeRules';

interface HealthLineProps {
  label: string;
  value: string;
  healthy: boolean;
}

function HealthLine({ label, value, healthy }: HealthLineProps) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">{label}</span>
      <span className={cn('text-sm font-semibold', healthy ? 'text-emerald-300' : 'text-zinc-500')}>
        {value}
      </span>
    </div>
  );
}

export interface NodeCardProps {
  node: BroadcastNode;
  now: Date;
  onHold: () => Promise<void>;
  onTake: () => Promise<void>;
  index?: number;
  reduceMotion?: boolean;
}

export function NodeCard({ node, now, onHold, onTake, index = 0, reduceMotion = false }: NodeCardProps) {
  const health = classifyNodeHealth(node.lastSeenAt, now);
  const needsAttention = nodeNeedsAttention(health);
  const isOffline = health === 'offline';
  const isStale = health === 'stale';

  const [holdConfirmOpen, setHoldConfirmOpen] = useState(false);
  const [takeConfirmOpen, setTakeConfirmOpen] = useState(false);
  const [holdPending, setHoldPending] = useState(false);

  async function handleHold() {
    setHoldPending(true);
    try {
      await onHold();
    } finally {
      setHoldPending(false);
      setHoldConfirmOpen(false);
    }
  }

  async function handleTake() {
    await onTake();
    setTakeConfirmOpen(false);
  }

  const lastSeenLabel =
    health === 'online'
      ? 'Live'
      : isStale
        ? `Last seen ${relativeLastSeen(node.lastSeenAt, now)}`
        : 'Offline';

  return (
    <>
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0.15 }
            : { type: 'spring', stiffness: 420, damping: 34, delay: index * 0.04 }
        }
        className={cn(
          'border border-white/10 bg-[#0a0a0c]/92 p-4 flex flex-col gap-3',
          needsAttention && 'border-l-2 border-l-rose-500',
        )}
      >
        {/* Row 1: Name + mode */}
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              'h-3 w-3 shrink-0 rounded-full',
              health === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600',
            )}
          />
          <span className="min-w-0 flex-1 truncate text-base font-bold text-white">
            {node.name}
          </span>
          <StatusPill tone="neutral" label={node.mode} />
        </div>

        {/* Row 2: HUD + GEP health */}
        <div className="grid grid-cols-2 gap-2">
          <HealthLine label="HUD" value={node.hudOnline ? 'Online' : 'Offline'} healthy={node.hudOnline} />
          <HealthLine label="GEP" value={node.gepActive ? 'Active' : 'Inactive'} healthy={node.gepActive} />
        </div>

        {/* Row 3: Last seen */}
        <p
          className={cn(
            'font-mono text-[11px]',
            health === 'online' ? 'text-zinc-500' : isStale ? 'text-amber-300' : 'text-zinc-500',
          )}
        >
          {lastSeenLabel}
        </p>

        {/* Row 4: Actions */}
        <div className="flex gap-2">
          <CommandButton
            variant="ghost"
            size="sm"
            disabled={isOffline || holdPending}
            title={isOffline ? 'Node is offline' : undefined}
            onClick={() => setHoldConfirmOpen(true)}
          >
            {holdPending ? (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-label="Sending hold" />
            ) : 'Hold'}
          </CommandButton>
          <CommandButton
            variant="ghost"
            size="sm"
            disabled={isOffline}
            title={isOffline ? 'Node is offline' : undefined}
            onClick={() => setTakeConfirmOpen(true)}
          >
            Take
          </CommandButton>
        </div>
      </motion.div>

      {/* Hold confirm */}
      <AlertDialog open={holdConfirmOpen} onOpenChange={setHoldConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hold</AlertDialogTitle>
            <AlertDialogDescription>
              Send hold command to {node.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction autoFocus onClick={() => void handleHold()}>
              Hold
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Take confirm */}
      <AlertDialog open={takeConfirmOpen} onOpenChange={setTakeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Take</AlertDialogTitle>
            <AlertDialogDescription>
              Send take command to {node.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction autoFocus onClick={() => void handleTake()}>
              Take
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
