export type MapTransitionAction = 'ban' | 'pick';

export interface MapTransitionState {
    action: MapTransitionAction;
    startedAt: number;
}

/** How long the flash overlay stays before the map leaves the pool grid. */
export const MAP_FLASH_MS = 480;

export const mapOverlayMotion = {
    ban: {
        initial: { opacity: 0, scale: 1.05 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
    },
    pick: {
        initial: { opacity: 0, scale: 1.05 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
    },
} as const;
