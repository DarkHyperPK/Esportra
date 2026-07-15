import { describe, expect, it } from 'vitest';
import {
    canSelectAdditionalMap,
    filterTournamentMaps,
} from '../tournamentMapPoolUtils';

const maps = [
    { id: 'm1', map_name: 'Bank', map_image_url: '/bank.avif' },
    { id: 'm2', map_name: 'Border', map_image_url: '/border.avif' },
    { id: 'm3', map_name: 'Chalet', map_image_url: '/chalet.avif' },
];

describe('TournamentMapPoolSelector helpers', () => {
    it('filters maps by search query', () => {
        const filtered = filterTournamentMaps(maps, 'bank', false, []);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].map_name).toBe('Bank');
    });

    it('filters to selected maps only', () => {
        const filtered = filterTournamentMaps(maps, '', true, ['m1', 'm3']);
        expect(filtered.map((map) => map.id)).toEqual(['m1', 'm3']);
    });

    it('blocks additional selection when exact veto pool is full', () => {
        expect(canSelectAdditionalMap(9, 9, true)).toBe(false);
        expect(canSelectAdditionalMap(8, 9, true)).toBe(true);
    });

    it('allows selection up to required count for non-veto pools', () => {
        expect(canSelectAdditionalMap(6, 7, false)).toBe(true);
        expect(canSelectAdditionalMap(7, 7, false)).toBe(false);
    });
});
