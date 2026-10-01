import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GameMap } from '@/hooks/useMapVetoMachine';
import { VetoMapArt } from './VetoMapArt';
import { getSideFullLabel, getVetoActionHoverClasses } from './vetoActionPresentation';
import { mapOverlayMotion, type MapTransitionAction } from './mapPoolAnimations';

export interface MapPoolTileStatus {
    isBanned: boolean;
    isTeam1Ban: boolean;
    isPicked: boolean;
    pickedBy?: string;
    pickedSide?: 'attack' | 'defend';
}

interface MapPoolTileProps {
    map: GameMap;
    status: MapPoolTileStatus;
    bannedByName?: string;
    currentAction: 'ban' | 'pick' | 'pick_side';
    canInteract: boolean;
    isLoading: boolean;
    flashAction?: MapTransitionAction;
    nameSizeClass: string;
    onSelect: (mapId: string) => void;
}

const TILE_TRANSITION = { duration: 0.22, ease: [0.2, 0, 0, 1] } as const;

function verb(action: MapPoolTileProps['currentAction']) {
    return action === 'pick' ? 'Pick' : 'Ban';
}

const TileCaption: React.FC<{ status: MapPoolTileStatus; bannedByName?: string; canInteract: boolean }> = ({ status, bannedByName, canInteract }) => {
    if (status.isBanned) {
        return <>Banned · {bannedByName}</>;
    }
    if (status.isPicked) {
        return (
            <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Picked{status.pickedBy ? ` · ${status.pickedBy}` : ''}
                {status.pickedSide ? ` · ${getSideFullLabel(status.pickedSide)}` : ''}
            </span>
        );
    }
    return <>{canInteract ? 'Available' : 'In pool'}</>;
};

/**
 * One map in the pool. Available maps are the brightest thing on the board;
 * banned maps lose colour and step back; picked maps keep colour and a confirmed dot.
 * On the deciding team's turn, hovering reveals the action bar (white speaks, rose confirms).
 */
export const MapPoolTile: React.FC<MapPoolTileProps> = ({
    map,
    status,
    bannedByName,
    currentAction,
    canInteract,
    isLoading,
    flashAction,
    nameSizeClass,
    onSelect,
}) => {
    const reduceMotion = useReducedMotion();
    const isSettled = status.isBanned || status.isPicked;
    const actionVerb = verb(currentAction);

    return (
        <motion.button
            type="button"
            layout={!reduceMotion}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : TILE_TRANSITION}
            disabled={!canInteract || isLoading}
            onClick={() => onSelect(map.id)}
            aria-label={canInteract ? `${actionVerb} ${map.map_name}` : `${map.map_name}${status.isBanned ? ', banned' : status.isPicked ? ', picked' : ''}`}
            className={cn(
                'group relative isolate block aspect-[16/10] min-h-[7rem] w-full overflow-hidden bg-zinc-900 text-left',
                'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-shadow duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-default',
                canInteract && !isLoading && cn('cursor-pointer', getVetoActionHoverClasses(currentAction)),
                status.isPicked && 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]',
                isLoading && 'opacity-70',
            )}
        >
            <VetoMapArt
                src={map.map_image_url}
                name={map.map_name}
                muted={status.isBanned}
                className={cn(
                    'transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
                    canInteract && 'group-hover:scale-[1.03]',
                )}
            />
            <div className={cn(
                'absolute inset-0 transition-colors duration-200',
                status.isBanned
                    ? 'bg-black/70'
                    : 'bg-gradient-to-t from-black/90 via-black/35 to-black/0',
                !isSettled && !canInteract && 'bg-black/30',
            )} />

            <div className={cn(
                'absolute inset-x-0 bottom-0 z-10 p-3 transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] sm:p-3.5',
                canInteract && 'group-hover:-translate-y-9 group-focus-visible:-translate-y-9',
            )}>
                <p className={cn(
                    'truncate font-heading font-black tracking-tight',
                    nameSizeClass,
                    status.isBanned ? 'text-zinc-500 line-through decoration-white/25' : 'text-white',
                )}>
                    {map.map_name}
                </p>
                <p className={cn(
                    'mt-0.5 truncate font-mono text-[9px] font-semibold uppercase tracking-[0.2em] sm:text-[10px]',
                    status.isPicked ? 'text-zinc-200' : 'text-zinc-500',
                )}>
                    <TileCaption status={status} bannedByName={bannedByName} canInteract={canInteract} />
                </p>
            </div>

            {canInteract ? (
                <span className="absolute inset-x-0 bottom-0 z-20 flex h-9 translate-y-full items-center justify-between overflow-hidden bg-white px-3 text-matte-black transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-y-0 group-focus-visible:translate-y-0">
                    <span aria-hidden className="absolute inset-0 -translate-x-full bg-rose-500 transition-transform duration-200 ease-[cubic-bezier(0.3,0,0,1)] group-active:translate-x-0" />
                    <span className="relative font-mono text-[11px] font-bold uppercase tracking-[0.2em] group-active:text-white">{actionVerb}</span>
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
