import type { VetoSequenceItem } from './buildVetoSequenceItems';

export type VetoStripKind = 'ban' | 'pick' | 'decider';
export type VetoStripStatus = 'done' | 'current' | 'upcoming';

export interface VetoStripCard {
    key: string;
    kind: VetoStripKind;
    stepNumber: number;
    status: VetoStripStatus;
    /** The map decision itself is recorded (a pick can be settled while its side is still open). */
    mapSettled: boolean;
    /** Team that banned or picked; undefined for the decider. */
    teamName?: string;
    mapName?: string;
    mapImageUrl?: string | null;
    side?: 'attack' | 'defend' | null;
    /** Team that chooses (or chose) the starting side on this map. */
    sideTeamName?: string;
    sideStatus?: VetoStripStatus;
}

function kindOf(action: string): VetoStripKind | 'side' | null {
    if (action === 'ban' || action === 'ignore') return 'ban';
    if (action === 'pick') return 'pick';
    if (action === 'auto_decider') return 'decider';
    if (action === 'pick_side') return 'side';
    return null;
}

/**
 * One card per map decision, in veto order. Side choices don't get a card of
 * their own: they attach to the pick they follow, or, after a ban, they settle
 * the leftover map and create the decider card.
 */
export function buildVetoStripCards(items: VetoSequenceItem[]): VetoStripCard[] {
    const cards: VetoStripCard[] = [];

    for (const item of items) {
        const kind = kindOf(item.action);
        if (!kind) continue;

        if (kind !== 'side') {
            cards.push({
                key: `${item.actionNumber}-${kind}`,
                kind,
                stepNumber: item.actionNumber,
                status: item.status,
                mapSettled: item.status === 'done',
                teamName: kind === 'decider' ? undefined : item.teamName,
                mapName: item.mapName,
                mapImageUrl: item.mapImageUrl,
            });
            continue;
        }

        const last = cards[cards.length - 1];
        const target = last && (last.kind === 'pick' || last.kind === 'decider') && !last.sideTeamName ? last : null;
        const sideFields = {
            side: item.side ?? null,
            sideTeamName: item.teamName,
            sideStatus: item.status,
        };

        if (target) {
            Object.assign(target, sideFields, {
                mapName: target.mapName ?? item.mapName,
                mapImageUrl: target.mapImageUrl ?? item.mapImageUrl,
                // A pick isn't settled until its side is chosen.
                status: target.status === 'done' && item.status !== 'done' ? item.status : target.status,
            });
            continue;
        }

        cards.push({
            key: `${item.actionNumber}-decider`,
            kind: 'decider',
            stepNumber: item.actionNumber,
            status: item.status,
            mapSettled: item.status === 'done',
            mapName: item.mapName,
            mapImageUrl: item.mapImageUrl,
            ...sideFields,
        });
    }

    return cards;
}
