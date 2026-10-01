import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GameMap } from '@/hooks/useMapVetoMachine';
import { VetoMapArt } from './VetoMapArt';
import { VetoCrest } from './VetoCrest';
import { getVetoActionHoverClasses } from './vetoActionPresentation';
import { mapOverlayMotion, type MapTransitionAction } from './mapPoolAnimations';

export interface MapPoolTileStatus {
    isBanned: boolean;
    isPicked: boolean;
    /** Team that banned or picked this map. */
    actorName?: string;
    actorLogo?: string | null;
    /** Position in the series for picked maps (1-based). */
    mapNumber?: number;
}

interface MapPoolTileProps {
    map: GameMap;
    status: MapPoolTileStatus;
    currentAction: 'ban' | 'pick' | 'pick_side';
    canInteract: boolean;
    isLoading: boolean;
    flashAction?: MapTransitionAction;
    nameSizeClass: string;
    onSelect: (mapId: string) => void;
}

const TILE_TRANSITION = { duration: 0.22, ease: [0.2, 0, 0, 1] } as const;

function ariaLabel(map: GameMap, status: MapPoolTileStatus, canInteract: boolean, verb: string) {
    if (canInteract) return `${verb} ${map.map_name}`;
    if (status.isBanned) return `${map.map_name}, banned${status.actorName ? ` by ${status.actorName}` : ''}`;
    if (status.isPicked) return `${map.map_name}, map ${status.mapNumber ?? ''} picked${status.actorName ? ` by ${status.actorName}` : ''}`;
    return map.map_name;
}

/** Banned: the map is struck from the board — colour gone, one hairline through it. */
const BannedMarks: React.FC<{ status: MapPoolTileStatus }> = ({ status }) => (
    <>
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
            <line x1="0" y1="100" x2="100" y2="0" stroke="rgba(255,255,255,0.14)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute left-2.5 top-2.5 z-10 flex items-center gap-2">
            {status.actorName ? <VetoCrest name={status.actorName} logo={status.actorLogo} className="h-6 w-6" /> : null}
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-400">Ban</span>
        </span>
    </>
);

/** Picked: the map keeps its colour and takes its place in the series. */
const PickedMarks: React.FC<{ status: MapPoolTileStatus }> = ({ status }) => (
    <span className="absolute inset-x-2.5 top-2.5 z-10 flex items-start justify-between gap-2">
        <span className="bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-matte-black">
            {status.mapNumber ? `Map ${status.mapNumber}` : 'Pick'}
        </span>
        {status.actorName ? <VetoCrest name={status.actorName} logo={status.actorLogo} className="h-6 w-6" /> : null}
    </span>
);

/**
 * One map in the pool. Open maps are the brightest thing on the board and carry
 * only their name; settled maps say who settled them with a crest, not a sentence.
 * On the deciding team's turn, hover or focus reveals the action bar
 * (white speaks, rose confirms on press).
 */
export const MapPoolTile: React.FC<MapPoolTileProps> = ({
    map,
    status,
    currentAction,
    canInteract,
    isLoading,
    flashAction,
    nameSizeClass,
    onSelect,
}) => {
    const reduceMotion = useReducedMotion();
    const verb = currentAction === 'pick' ? 'Pick' : 'Ban';
    const pickedNote = status.isPicked && status.actorName ? `${status.actorName} pick` : null;

    return (
        <motion.button
            type="button"
            layout={!reduceMotion}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : TILE_TRANSITION}
            disabled={!canInteract || isLoading}
            onClick={() => onSelect(map.id)}
            aria-label={ariaLabel(map, status, canInteract, verb)}
            className={cn(
                'group relative isolate block aspect-[16/10] min-h-[7rem] w-full overflow-hidden bg-zinc-900 text-left',
                'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-shadow duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-default',
                canInteract && !isLoading && cn('cursor-pointer', getVetoActionHoverClasses(currentAction)),
                status.isPicked && 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]',
                isLoading && 'opacity-70',
            )}
        >
            <VetoMapArt
                src={map.map_image_url}
                name={map.map_name}
                muted={status.isBanned}
                className={cn(
                    'transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
                    canInteract && 'group-hover:scale-[1.04]',
                )}
            />
            <div className={cn(
                'absolute inset-0',
                status.isBanned ? 'bg-black/75' : 'bg-gradient-to-t from-black/85 via-black/20 to-black/0',
            )} />

            {status.isBanned ? <BannedMarks status={status} /> : null}
            {status.isPicked ? <PickedMarks status={status} /> : null}

            <div className={cn(
                'absolute inset-x-0 bottom-0 z-10 p-3 transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] sm:p-3.5',
                canInteract && 'group-hover:-translate-y-9 group-focus-visible:-translate-y-9',
            )}>
                <p className={cn(
                    'truncate font-heading font-black tracking-tight',
                    nameSizeClass,
                    status.isBanned ? 'text-zinc-500' : 'text-white',
                )}>
                    {map.map_name}
                </p>
                {pickedNote ? <p className="mt-0.5 truncate text-[11px] text-zinc-300">{pickedNote}</p> : null}
            </div>

            {canInteract ? (
                <span className="absolute inset-x-0 bottom-0 z-20 flex h-9 translate-y-full items-center justify-between overflow-hidden bg-white px-3 text-matte-black transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-y-0 group-focus-visible:translate-y-0">
                    <span aria-hidden className="absolute inset-0 -translate-x-full bg-rose-500 transition-transform duration-200 ease-[cubic-bezier(0.3,0,0,1)] group-active:translate-x-0" />
                    <span className="relative font-mono text-[11px] font-bold uppercase tracking-[0.2em] group-active:text-white">{verb}</span>
                    <span className="relative truncate pl-3 font-mono text-[11px] font-bold uppercase tracking-[0.12em] group-active:text-white">{map.map_name}</span>
                </span>
            ) : null}

            <AnimatePresence>
                {flashAction ? (
                    <motion.span
                        key={`${map.id}-${flashAction}`}
                        initial={reduceMotion ? false : mapOverlayMotion[flashAction].initial}
                        animate={mapOverlayMotion[flashAction].animate}
                        exit={{ opacity: 0, transition: { duration: 0.11 } }}
                        transition={mapOverlayMotion[flashAction].transition}
                        className="absolute inset-0 z-30 flex items-center justify-center bg-black/75"
                    >
                        <span className={cn(
                            'border px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.3em]',
                            flashAction === 'ban' ? 'border-white/20 text-zinc-300' : 'border-white/60 bg-white text-matte-black',
                        )}>
                            {flashAction === 'ban' ? 'Banned' : 'Picked'}
                        </span>
                    </motion.span>
                ) : null}
            </AnimatePresence>
        </motion.button>
    );
};

export default MapPoolTile;
