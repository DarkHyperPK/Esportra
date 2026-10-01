import React from 'react';
import { cn } from '@/lib/utils';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { VetoMapArt } from './VetoMapArt';
import { getSideFullLabel } from './vetoActionPresentation';
import type { VetoSelectedMapEntry } from './buildVetoSelectedMapEntries';

interface VetoLineupProps {
    entries: VetoSelectedMapEntry[];
    /** Number of maps in the series; empty slots render as "To be decided". */
    bestOf: number;
    /** `cards` is the hero lineup; `rail` is the compact list beside the pool. */
    variant?: 'cards' | 'rail';
    className?: string;
}

function pad(value: number) {
    return String(value).padStart(2, '0');
}

function pickerCaption(entry: VetoSelectedMapEntry) {
    return entry.mapPickerTeamName === 'Decider' ? 'Decider' : `Picked by ${entry.mapPickerTeamName}`;
}

function sideLine(entry: VetoSelectedMapEntry) {
    if (!entry.side || !entry.sidePickerTeamName) return 'Starting side pending';
    return `${entry.sidePickerTeamName} start on ${getSideFullLabel(entry.side).toLowerCase()}`;
}

const RailRow: React.FC<{ entry?: VetoSelectedMapEntry; slot: number }> = ({ entry, slot }) => (
    <li className="grid grid-cols-[2.25rem_4.5rem_minmax(0,1fr)] items-center gap-3 bg-card px-3 py-2.5">
        <span className="font-heading text-lg font-black tabular-nums text-zinc-500">{pad(slot)}</span>
        <div className="relative h-11 w-[4.5rem] overflow-hidden">
            {entry ? <VetoMapArt src={entry.map_image_url} name={entry.map_name} /> : <div className="absolute inset-0 border border-dashed border-white/10" />}
        </div>
        <div className="min-w-0">
            <p className={cn('truncate text-sm font-semibold', entry ? 'text-white' : 'text-zinc-600')}>
                {entry ? entry.map_name : 'To be decided'}
            </p>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                {entry ? pickerCaption(entry) : `Map ${slot}`}
            </p>
        </div>
    </li>
);

const LineupCard: React.FC<{ entry?: VetoSelectedMapEntry; slot: number }> = ({ entry, slot }) => (
    <li className="relative isolate flex aspect-[2/1] min-h-[150px] sm:aspect-[16/10] flex-col justify-end overflow-hidden bg-card">
        {entry ? (
            <>
                <VetoMapArt src={entry.map_image_url} name={entry.map_name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/10" />
            </>
        ) : (
            <div className="absolute inset-0 border border-dashed border-white/10" />
        )}
        <div className="relative z-10 p-4">
            <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                    <p className={cn(EYEBROW_CLASS, entry && 'text-zinc-300')}>{entry ? pickerCaption(entry) : `Map ${slot}`}</p>
                    <p className={cn(
                        'mt-1 truncate font-heading text-2xl font-black tracking-tight sm:text-[28px]',
                        entry ? 'text-white' : 'text-zinc-600',
                    )}>
                        {entry ? entry.map_name : 'To be decided'}
                    </p>
                </div>
                <span className="font-heading text-4xl font-black leading-none tabular-nums text-white/15">{pad(slot)}</span>
            </div>
            {entry ? (
                <p className="mt-3 border-t border-white/10 pt-2.5 text-xs text-zinc-300">{sideLine(entry)}</p>
            ) : null}
        </div>
    </li>
);

/** The series as it will be played: one slot per map, in order. */
export const VetoLineup: React.FC<VetoLineupProps> = ({ entries, bestOf, variant = 'cards', className }) => {
    const slotCount = Math.max(bestOf || 1, entries.length);
    const slots = Array.from({ length: slotCount }, (_, index) => entries.find((entry) => entry.mapNumber === index + 1));

    if (variant === 'rail') {
        return (
            <ol className={cn('grid gap-px bg-white/[0.06]', className)} aria-label="Series maps">
                {slots.map((entry, index) => <RailRow key={entry?.map_id ?? `slot-${index}`} entry={entry} slot={index + 1} />)}
            </ol>
        );
    }

    return (
        <ol
            className={cn(
                'grid gap-px bg-white/[0.06]',
                slotCount === 1 ? 'grid-cols-1' : slotCount === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-5',
                className,
            )}
            aria-label="Series maps"
        >
            {slots.map((entry, index) => <LineupCard key={entry?.map_id ?? `slot-${index}`} entry={entry} slot={index + 1} />)}
        </ol>
    );
};

export default VetoLineup;
