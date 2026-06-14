import { describe, expect, it } from 'vitest';
import { hasTournamentStaffAccess } from '@/hooks/useTournamentStaffAccess';
import type { TournamentStaffInvite } from '@/lib/tournamentStaff';

describe('hasTournamentStaffAccess', () => {
  const assignments: TournamentStaffInvite[] = [
    {
      id: 'a1',
      tournament_id: 't-1',
      user_id: 'u-1',
      role: 'moderator',
      permissions: ['scores:update'],
      status: 'active',
      assigned_by: 'owner-1',
      created_at: '',
      updated_at: '',
      tournament: {
        id: 't-1',
        name: 'Alpha Cup',
        slug: 'alpha-cup',
        game: 'cs2',
        start_date: null,
      },
    },
    {
      id: 'a2',
      tournament_id: 't-2',
      user_id: 'u-1',
      role: 'moderator',
      permissions: ['bracket:edit'],
      status: 'active',
      assigned_by: 'owner-2',
      created_at: '',
      updated_at: '',
      tournament: {
        id: 't-2',
        name: 'Beta League',
        slug: 'beta-league',
        game: 'valorant',
        start_date: null,
      },
    },
  ];

  it('grants access only for the requested tournament slug', () => {
    expect(hasTournamentStaffAccess(assignments, 'alpha-cup')).toBe(true);
    expect(hasTournamentStaffAccess(assignments, 'beta-league')).toBe(true);
    expect(hasTournamentStaffAccess(assignments, 'gamma-open')).toBe(false);
  });

  it('matches tournament id when slug is unavailable', () => {
    expect(hasTournamentStaffAccess(assignments, 't-1')).toBe(true);
    expect(hasTournamentStaffAccess(assignments, 't-99')).toBe(false);
  });

  it('returns false when slug is missing or assignments empty', () => {
    expect(hasTournamentStaffAccess([], 'alpha-cup')).toBe(false);
    expect(hasTournamentStaffAccess(assignments, undefined)).toBe(false);
  });

  it('grants access for org admin assignments without explicit permissions', () => {
    const adminAssignments: TournamentStaffInvite[] = [
      {
        id: 'admin-1',
        tournament_id: 't-3',
        user_id: 'u-1',
        role: 'admin',
        permissions: ['scores:update', 'teams:manage', 'bracket:edit', 'announcements:send', 'disputes:assist'],
        status: 'active',
        assigned_by: 'owner-1',
        created_at: '',
        updated_at: '',
        tournament: {
          id: 't-3',
          name: 'Org Cup',
          slug: 'org-cup',
          game: 'cs2',
          start_date: null,
        },
      },
    ];
    expect(hasTournamentStaffAccess(adminAssignments, 'org-cup')).toBe(true);
  });
});
