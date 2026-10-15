import React from 'react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import {
  GripVertical, Swords, Clock, Circle, Flag,
  DollarSign, Edit3, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommandIconButton } from '@/components/management/CommandSurface';
import { StatusPill } from '@/components/ui/kit/StatusPill';
import { CONTROL_CLASS } from '@/components/ui/kit/tone';
import type { ShowSegment, SegmentType } from '@/types/broadcast';
import { RundownPlanEditor } from './RundownPlanEditor';

const SEGMENT_ICONS: Record<SegmentType, React.ReactNode> = {
  match:        <Swords className="h-4 w-4 text-zinc-400" />,
  break:        <Clock className="h-4 w-4 text-zinc-400" />,
  pre_show:     <Circle className="h-4 w-4 text-zinc-400" />,
  post_show:    <Flag className="h-4 w-4 text-zinc-400" />,
  sponsor_slot: <DollarSign className="h-4 w-4 text-zinc-400" />,
  custom:       <Edit3 className="h-4 w-4 text-zinc-400" />,
};

const SEGMENT_LABELS: Record<SegmentType, string> = {
  match: 'Match', break: 'Break', pre_show: 'Pre-show',
  post_show: 'Post-show', sponsor_slot: 'Sponsor slot', custom: 'Custom',
};

const STATUS_TONE = {
  pending: 'neutral',
  active:  'accent',
  done:    'success',
} as const;

export interface RundownRowProps {
  segment: ShowSegment;
  index?: number;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onChange: (patch: Partial<ShowSegment>) => void;
  onRemove: () => void;
  isLive?: boolean;
  reduceMotion?: boolean;
}

export function RundownRow({
  segment,
  index,
  isExpanded,
  onExpand,
  onCollapse,
  onChange,
  onRemove,
  isLive = false,
  reduceMotion = false,
}: RundownRowProps) {
  const locked = isLive;

  return (
    <Reorder.Item
      key={segment.id}
      value={segment}
      dragListener={!locked}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0.1 }
          : { type: 'spring', stiffness: 420, damping: 34, delay: Math.min(index ?? 0, 5) * 0.025 }
      }
      className={cn(
        'border-b border-white/[0.05] transition-colors duration-150',
        isExpanded && !isLive && 'border-l-2 border-l-rose-500 bg-white/[0.025]',
        locked && 'opacity-80',
      )}
      aria-label={`Broadcast screens screen: ${segment.title}`}
    >
      {/* Row */}
      <div className={cn(
        'flex min-h-[56px] items-center gap-3 px-4 py-2 hover:bg-white/[0.025]',
        !locked && 'cursor-grab active:cursor-grabbing',
      )}>
        <button
          type="button"
          aria-label="Drag to reorder"
          disabled={locked}
          title={locked ? 'Show is live — screen order is locked' : 'Drag to reorder'}
          className="shrink-0 text-zinc-600 disabled:cursor-not-allowed"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="shrink-0">{SEGMENT_ICONS[segment.type]}</span>

        <span className="flex-1 truncate text-sm font-medium text-white">
          {segment.title}
        </span>

        <span className="w-12 shrink-0 text-right font-mono text-[11px] text-zinc-500">
          {segment.estimatedDuration ?? '—'}
        </span>

        <StatusPill tone={STATUS_TONE[segment.status]} label={segment.status} />

        <CommandIconButton
          variant="ghost"
          label={`Edit ${segment.title}`}
          disabled={locked}
          title={locked ? 'Show is live — screen order is locked' : `Edit ${segment.title}`}
          onClick={isExpanded ? onCollapse : onExpand}
        >
          <Edit3 />
        </CommandIconButton>

        <CommandIconButton
          variant="ghost"
          label={`Remove ${segment.title}`}
          disabled={locked}
          title={locked ? 'Show is live — screen order is locked' : `Remove ${segment.title}`}
          onClick={onRemove}
        >
          <Trash2 />
        </CommandIconButton>
      </div>

      {/* Inline expand */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="expand"
            initial={reduceMotion ? { opacity: 0, height: 'auto' } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0, height: 0 } : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3 px-4 pb-3 pt-1">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Title
                </label>
                <input
                  className={cn(CONTROL_CLASS, 'h-9 w-full px-2 text-sm')}
                  value={segment.title}
                  onChange={(e) => onChange({ title: e.target.value })}
                  aria-label="Screen name"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Est. duration
                </label>
                <input
                  className={cn(CONTROL_CLASS, 'h-9 w-full px-2 text-sm')}
                  value={segment.estimatedDuration ?? ''}
                  onChange={(e) => onChange({ estimatedDuration: e.target.value })}
                  placeholder="e.g. 15m"
                  aria-label="Estimated duration"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Type
                </label>
                <select
                  className={cn(CONTROL_CLASS, 'h-9 w-full rounded-none px-2 text-sm')}
                  value={segment.type}
                  onChange={(e) => onChange({ type: e.target.value as SegmentType })}
                  aria-label="Segment type"
                >
                  {(Object.keys(SEGMENT_LABELS) as SegmentType[]).map((t) => (
                    <option key={t} value={t}>{SEGMENT_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Notes
                </label>
                <input
                  className={cn(CONTROL_CLASS, 'h-9 w-full px-2 text-sm')}
                  value={segment.notes ?? ''}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  placeholder="Optional"
                  aria-label="Segment notes"
                />
              </div>
            </div>
            <RundownPlanEditor key={segment.id + JSON.stringify(segment.plan)} segment={segment} />
            <div className="flex justify-end px-4 pb-3">
              <button
                type="button"
                className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white"
                onClick={onCollapse}
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
