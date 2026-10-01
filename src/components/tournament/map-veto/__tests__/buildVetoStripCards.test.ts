import { describe, expect, it } from 'vitest';
import { buildVetoStripCards } from '../buildVetoStripCards';
import type { VetoSequenceItem } from '../buildVetoSequenceItems';

const step = (
    actionNumber: number,
    action: VetoSequenceItem['action'],
    teamName: string,
    status: VetoSequenceItem['status'],
    mapName?: string,
    side?: 'attack' | 'defend',
): VetoSequenceItem => ({
    actionNumber,
    action,
    teamName,
    lane: teamName === 'Alpha' ? 'team1' : 'team2',
    mapName,
    mapImageUrl: null,
    side,
    status,
});

describe('buildVetoStripCards', () => {
    it('makes one card per map decision and folds side choices into the pick', () => {
        const cards = buildVetoStripCards([
            step(1, 'ban', 'Alpha', 'done', 'Haven'),
            step(2, 'ban', 'Beta', 'done', 'Bind'),
            step(3, 'pick', 'Alpha', 'done', 'Ascent'),
            step(4, 'pick_side', 'Beta', 'done', 'Ascent', 'defend'),
        ]);

        expect(cards.map((card) => card.kind)).toEqual(['ban', 'ban', 'pick']);
        expect(cards[2]).toMatchObject({ mapName: 'Ascent', teamName: 'Alpha', side: 'defend', sideTeamName: 'Beta', status: 'done' });
    });

    it('keeps a pick current while its side is still being chosen', () => {
        const cards = buildVetoStripCards([
            step(3, 'pick', 'Alpha', 'done', 'Ascent'),
            step(4, 'pick_side', 'Beta', 'current', 'Ascent'),
        ]);

        expect(cards).toHaveLength(1);
        expect(cards[0]).toMatchObject({ status: 'current', sideStatus: 'current' });
    });

    it('turns a side choice after bans into the decider card', () => {
        const cards = buildVetoStripCards([
            step(7, 'ban', 'Alpha', 'done', 'Sunset'),
            step(8, 'ban', 'Beta', 'done', 'Pearl'),
            step(9, 'pick_side', 'Alpha', 'upcoming'),
        ]);

        expect(cards.map((card) => card.kind)).toEqual(['ban', 'ban', 'decider']);
        expect(cards[2]).toMatchObject({ status: 'upcoming', sideTeamName: 'Alpha' });
        expect(cards[2].teamName).toBeUndefined();
    });

    it('attaches upcoming side steps to upcoming picks by order', () => {
        const cards = buildVetoStripCards([
            step(5, 'pick', 'Beta', 'upcoming'),
            step(6, 'pick_side', 'Alpha', 'upcoming'),
        ]);

        expect(cards).toHaveLength(1);
        expect(cards[0]).toMatchObject({ kind: 'pick', teamName: 'Beta', sideTeamName: 'Alpha' });
    });
});
