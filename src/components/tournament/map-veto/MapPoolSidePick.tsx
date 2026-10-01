import React from 'react';
import { cn } from '@/lib/utils';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import type { GameMap } from '@/hooks/useMapVetoMachine';
import { VetoMapArt } from './VetoMapArt';

interface MapPoolSidePickProps {
    map: GameMap;
    isDecider: boolean;
    canInteract: boolean;
    isLoading: boolean;
    currentTeamName: string;
    compact: boolean;
    onSelect: (mapId: string) => void;
}

/** Side choice: the chosen map takes the stage alone, with one action. */
export const MapPoolSidePick: React.FC<MapPoolSidePickProps> = ({
    map,
    isDecider,
    canInteract,
    isLoading,
    currentTeamName,
    compact,
    onSelect,
}) => (
    <div className={cn(
        'relative isolate overflow-hidden bg-zinc-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]',
        'h-44 w-full max-w-xl sm:h-48',
        isLoading && 'opacity-60',
    )}>
        <VetoMapArt src={map.map_image_url} name={map.map_name} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/10" />
        <div className="relative z-10 flex h-full flex-col justify-end gap-4 p-5 sm:p-7">
            <div>
                <p className={EYEBROW_CLASS}>{isDecider ? 'Decider map' : 'Picked map'}</p>
                <p className={cn(
                    'mt-1 font-heading font-black leading-none tracking-tight text-white',
                    compact ? 'text-2xl' : 'text-3xl',
                )}>
                    {map.map_name}
                </p>
            </div>
            {canInteract ? (
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => onSelect(map.id)}
                    className="group relative inline-flex h-11 w-fit items-center overflow-hidden border border-white bg-white px-5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-matte-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-50"
                >
                    <span aria-hidden className="absolute inset-0 translate-y-full bg-rose-500 transition-transform duration-200 ease-[cubic-bezier(0.3,0,0,1)] group-hover:translate-y-0" />
                    <span className="relative group-hover:text-white">Choose starting side</span>
                </button>
            ) : (
                <p className="text-sm text-zinc-400">Waiting for {currentTeamName} to choose a starting side.</p>
            )}
        </div>
    </div>
);

export default MapPoolSidePick;
