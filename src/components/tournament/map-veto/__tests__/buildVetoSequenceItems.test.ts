import { describe, expect, it } from 'vitest';
import { buildVetoSequenceItems } from '../buildVetoSequenceItems';
import type { MatchMapVeto } from '@/hooks/useMapVetoMachine';
import type { VetoHistoryEntry } from '@/hooks/useVetoHistory';

function veto(overrides: Partial<MatchMapVeto> = {}): MatchMapVeto {
    return {
        id: 'v1',
        match_id: 'match-1',
        tournament_id: 't1',
        team1_id: 'team1',
        team2_id: 'team2',
        team1_link_token: null,
        team2_link_token: null,
        best_of: 3,
        status: 'in_progress',
        current_team_id: 'team1',
        current_action: 'ban',
        current_action_number: 2,
        turn_started_at: null,
        turn_duration_seconds: 0,
        team1_banned_maps: ['m1'],
        team2_banned_maps: [],
        team1_picked_maps: [],
        team2_picked_maps: [],
        selected_map_id: null,
        selected_map_pool: [],
        started_at: null,
        completed_at: null,
        game: 'valorant',
        ...overrides,
    };
}

const firstBan: VetoHistoryEntry = {
    actionNumber: 1,
    teamSide: 'team1',
    teamId: 'team1',
    teamName: 'Alpha',
    action: 'ban',
    mapId: 'm1',
    mapName: 'Haven',
    mapImageUrl: null,
    createdAt: '2026-10-01T12:00:00Z',
};

const base = { team1Name: 'Alpha', team2Name: 'Beta', bestOf: 3, game: 'valorant' };

describe('buildVetoSequenceItems', () => {
    it('marks recorded steps done, the current step current, and the rest upcoming', () => {
        const items = buildVetoSequenceItems({ ...base, veto: veto(), entries: [firstBan] });

        expect(items[0]).toMatchObject({ actionNumber: 1, status: 'done', mapName: 'Haven' });
        expect(items[1]).toMatchObject({ actionNumber: 2, status: 'current' });
        expect(items.slice(2).every((item) => item.status === 'upcoming')).toBe(true);
    });

    it('returns only recorded steps once the veto is complete', () => {
        const items = buildVetoSequenceItems({ ...base, veto: veto({ status: 'completed' }), entries: [firstBan] });

        expect(items).toHaveLength(1);
        expect(items[0].status).toBe('done');
    });

    it('follows a custom sequence from the organizer', () => {
        const items = buildVetoSequenceItems({
            ...base,
            veto: veto(),
            entries: [firstBan],
            externalSequence: [
                { actionNumber: 1, action: 'ban', team: 'T1', isDecider: false },
                { actionNumber: 2, action: 'ban', team: 'T2', isDecider: false },
                { actionNumber: 3, action: 'pick', team: 'T1', isDecider: false },
            ],
        });

        expect(items.map((item) => item.action)).toEqual(['ban', 'ban', 'pick']);
        expect(items[1].teamName).toBe('Beta');
    });

    it('shows nothing before the veto starts without a sequence', () => {
        const items = buildVetoSequenceItems({
            ...base,
            veto: veto({ status: 'pending', current_team_id: null, current_action: null, current_action_number: 0 }),
            entries: [],
        });

        expect(items).toEqual([]);
    });
});

describe('veto action normalisation', () => {
    it('reads action names in any case', async () => {
        const { normalizeVetoAction } = await import('@/hooks/useMapVetoMachine');
        expect(normalizeVetoAction('Pick')).toBe('pick');
        expect(normalizeVetoAction('BAN')).toBe('ban');
        expect(normalizeVetoAction('PickSide')).toBe('pick_side');
        expect(normalizeVetoAction('pick-side')).toBe('pick_side');
        expect(normalizeVetoAction(undefined)).toBeNull();
    });

    it('keeps picks as picks in history and puts each step in its team lane', async () => {
        const { normalizeHistoryEntry } = await import('@/hooks/useVetoHistory');
        const entry = normalizeHistoryEntry({ actionNumber: 3, teamSide: 'team2', action: 'Pick', mapId: 'm3', mapName: 'Ascent', side: 'Defense' });
        expect(entry.action).toBe('pick');
        expect(entry.side).toBe('defend');

        const items = buildVetoSequenceItems({ ...base, veto: veto({ status: 'completed' }), entries: [entry] });
        expect(items[0]).toMatchObject({ action: 'pick', lane: 'team2' });
    });
});
