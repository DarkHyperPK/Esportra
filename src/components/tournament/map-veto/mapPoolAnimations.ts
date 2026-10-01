export type MapTransitionAction = 'ban' | 'pick';

export interface MapTransitionState {
    action: MapTransitionAction;
    startedAt: number;
}

/** How long the confirm overlay stays before the tile settles into its banned/picked state. */
export const MAP_FLASH_MS = 520;

const CONFIRM = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.18, ease: [0.3, 0, 0, 1] },
} as const;

/** Confirm verb: a calm fade, no scale or bounce. */
export const mapOverlayMotion = {
    ban: CONFIRM,
    pick: CONFIRM,
} as const;
