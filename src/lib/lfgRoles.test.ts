import { describe, expect, it } from 'vitest';
import { withLfgStaffRoles } from './lfgRoles';

describe('LFG staff roles', () => {
  it('adds coach and manager for any selected game while retaining catalog roles', () => {
    const player = { id: '1', gameSlug: 'valorant', roleKey: 'duelist', displayName: 'Duelist', sortOrder: 1, iconUrl: null };
    expect(withLfgStaffRoles('valorant', [player]).map(role => role.roleKey)).toEqual(['duelist', 'coach', 'manager']);
    expect(withLfgStaffRoles('cs2', []).map(role => role.roleKey)).toEqual(['coach', 'manager']);
    expect(withLfgStaffRoles('', [])).toEqual([]);
  });
  it('does not duplicate a staff role already provided by the game catalog', () => {
    const coach = { id: '2', gameSlug: 'game', roleKey: 'coach', displayName: 'Coach', sortOrder: 1, iconUrl: null };
    expect(withLfgStaffRoles('game', [coach]).map(role => role.roleKey)).toEqual(['coach', 'manager']);
  });
});
