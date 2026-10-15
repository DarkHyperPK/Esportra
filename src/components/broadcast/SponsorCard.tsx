import { Reorder } from 'framer-motion';
import { GripVertical, Camera, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommandIconButton } from '@/components/management/CommandSurface';
import { StatusPill } from '@/components/ui/kit/StatusPill';
import { ToggleRow } from '@/components/ui/kit/ToggleRow';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import type { BroadcastSponsor } from '@/types/broadcast';

export interface SponsorCardProps {
  sponsor: BroadcastSponsor;
  onEdit: () => void;
  onRemove?: () => void;
  onToggleActive: (active: boolean) => void;
  isTogglePending?: boolean;
  index?: number;
  reduceMotion?: boolean;
}

export function SponsorCard({
  sponsor,
  onEdit,
  onRemove,
  onToggleActive,
  isTogglePending = false,
  index,
  reduceMotion = false,
}: SponsorCardProps) {
  return (
    <Reorder.Item
      key={sponsor.id}
      value={sponsor}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0.1 }
          : { type: 'spring', stiffness: 420, damping: 34, delay: Math.min(index ?? 0, 3) * 0.04 }
      }
      className={cn(
        'w-[180px] min-h-[200px] border border-white/10 bg-[#0a0a0c]/92 flex flex-col gap-3 p-3',
      )}
    >
      {/* Drag handle + edit */}
      {onRemove && <button type="button" className="text-xs text-zinc-400 hover:text-white" onClick={onRemove} aria-label={`Remove ${sponsor.name}`}>Remove</button>}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="cursor-grab text-zinc-600 active:cursor-grabbing"
          aria-label={`Drag to reorder ${sponsor.name}`}
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <CommandIconButton
          variant="ghost"
          label={`Edit ${sponsor.name}`}
          onClick={onEdit}
        >
          <Edit3 />
        </CommandIconButton>
      </div>

      {/* Logo area */}
      <div
        className="aspect-square border border-white/[0.06] bg-white/[0.04] flex items-center justify-center"
        aria-label={sponsor.logoUrl ? undefined : `${sponsor.name} — no logo uploaded`}
      >
        {sponsor.logoUrl ? (
          <OptimizedImage
            src={sponsor.logoUrl}
            alt={sponsor.name}
            className="h-16 w-16 object-contain"
          />
        ) : (
          <Camera className="h-8 w-8 text-zinc-600" aria-hidden />
        )}
      </div>

      {/* Name */}
      <p className="truncate text-sm font-semibold text-white">{sponsor.name}</p>

      {/* Display slot */}
      <StatusPill tone="neutral" label={sponsor.displaySlot} />

      {/* Active toggle */}
      <ToggleRow
        id={`sponsor-active-${sponsor.id}`}
        title="Active"
        description="Show in HUD overlays."
        checked={sponsor.isActive}
        onCheckedChange={onToggleActive}
        disabled={isTogglePending}
      />
    </Reorder.Item>
  );
}
