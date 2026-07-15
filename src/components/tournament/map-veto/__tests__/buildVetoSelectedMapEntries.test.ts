import { describe, expect, it } from 'vitest';
import { buildVetoSelectedMapEntries } from '../buildVetoSelectedMapEntries';
import type { MatchMapVeto } from '@/hooks/useMapVetoMachine';

const MAPS = [
    { id: 'm1', map_name: 'Map 1' },
    { id: 'm2', map_name: 'Map 2' },
    { id: 'm3', map_name: 'Map 3' },
    { id: 'm4', map_name: 'Map 4' },
    { id: 'm5', map_name: 'Map 5' },
    { id: 'm6', map_name: 'Map 6' },
    { id: 'm7', map_name: 'Map 7' },
];

function baseVeto(overrides: Partial<MatchMapVeto> = {}): MatchMapVeto {
    return {
        id: 'v1',
        match_id: 'match-1',
        tournament_id: 't1',
        team1_id: 'team1',
        team2_id: 'team2',
        team1_link_token: null,
        team2_link_token: null,
        best_of: 3,
        status: 'completed',
        current_team_id: null,
        current_action: null,
        current_action_number: 11,
        turn_started_at: null,
        turn_duration_seconds: 0,
        team1_banned_maps: ['m1', 'm2'],
        team2_banned_maps: ['m3', 'm4'],
        team1_picked_maps: [{ map_id: 'm5', side: 'attack' }],
        team2_picked_maps: [{ map_id: 'm6', side: 'defend' }, { map_id: 'm7', side: 'attack' }],
        selected_map_id: 'm7',
        selected_map_pool: MAPS.map((map) => map.id),
        started_at: null,
        completed_at: null,
        game: 'valorant',
        ...overrides,
    };
}

describe('buildVetoSelectedMapEntries', () => {
    it('returns 3 maps for completed BO3 (2 picks + decider)', () => {
        const entries = buildVetoSelectedMapEntries({
            veto: baseVeto({ best_of: 3 }),
            bestOf: 3,
            game: 'valorant',
            mapLookup: MAPS,
            team1Name: 'Alpha',
            team2Name: 'Beta',
        });

        expect(entries).toHaveLength(3);
        expect(entries.map((entry) => entry.map_id)).toEqual(['m5', 'm6', 'm7']);
        expect(entries[2].mapPickerTeamName).toBe('Decider');
    });

    it('returns 5 maps for completed BO5 (4 picks + decider)', () => {
        const bo5Maps = [
            ...MAPS,
            { id: 'm8', map_name: 'Map 8' },
            { id: 'm9', map_name: 'Map 9' },
        ];
        const entries = buildVetoSelectedMapEntries({
            veto: baseVeto({
                best_of: 5,
                current_action_number: 15,
                team1_banned_maps: ['m1'],
                team2_banned_maps: ['m2'],
                team1_picked_maps: [
                    { map_id: 'm3', side: 'attack' },
                    { map_id: 'm5', side: 'defend' },
                ],
                team2_picked_maps: [
                    { map_id: 'm4', side: 'attack' },
                    { map_id: 'm6', side: 'defend' },
                    { map_id: 'm7', side: 'attack' },
                ],
                selected_map_id: 'm7',
                selected_map_pool: bo5Maps.map((map) => map.id),
            }),
            bestOf: 5,
            game: 'valorant',
            mapLookup: bo5Maps,
            team1Name: 'Alpha',
            team2Name: 'Beta',
        });

        expect(entries).toHaveLength(5);
        expect(entries[4].mapPickerTeamName).toBe('Decider');
    });

    it('returns 1 map for completed Valorant BO1 ban-pick', () => {
        const entries = buildVetoSelectedMapEntries({
            veto: baseVeto({
                best_of: 1,
                current_action_number: 7,
                team1_banned_maps: ['m1', 'm3', 'm5', 'm7'],
                team2_banned_maps: ['m2', 'm4'],
                team1_picked_maps: [{ map_id: 'm6', side: 'attack' }],
                team2_picked_maps: [],
                selected_map_id: 'm6',
            }),
            bestOf: 1,
            game: 'valorant',
            mapLookup: MAPS,
            team1Name: 'Alpha',
            team2Name: 'Beta',
        });

        expect(entries).toHaveLength(1);
        expect(entries[0].map_id).toBe('m6');
    });

    it('returns 1 decider map for completed CS2 BO1 pure-ban', () => {
        const entries = buildVetoSelectedMapEntries({
            veto: baseVeto({
                best_of: 1,
                current_action_number: 7,
                team1_banned_maps: ['m1', 'm3', 'm5'],
                team2_banned_maps: ['m2', 'm4', 'm6'],
                team1_picked_maps: [{ map_id: 'm7', side: 'attack' }],
                team2_picked_maps: [],
                selected_map_id: 'm7',
                game: 'cs2',
            }),
            bestOf: 1,
            game: 'cs2',
            mapLookup: MAPS,
            team1Name: 'Alpha',
            team2Name: 'Beta',
        });

        expect(entries).toHaveLength(1);
        expect(entries[0].map_id).toBe('m7');
        expect(entries[0].mapPickerTeamName).toBe('Decider');
    });

    it('omits decider map until decider side pick is reached', () => {
        const entries = buildVetoSelectedMapEntries({
            veto: baseVeto({
                best_of: 3,
                status: 'in_progress',
                current_action_number: 8,
            }),
            bestOf: 3,
            game: 'valorant',
            mapLookup: MAPS,
            team1Name: 'Alpha',
            team2Name: 'Beta',
        });

        expect(entries).toHaveLength(2);
    });
});
