import { describe, expect, it } from 'vitest';
import type { BracketMatch } from '@/types/bracketTypes';
import {
  findNextTeamMatch,
  isBracketMatchSettled,
  isPlayableMatchStatus,
  resolveActiveMatch,
} from './matchRoomLifecycle';

const team = (id: string, name: string) => ({ id, name, seed: 1, logo_url: null });

const mkMatch = (overrides: Partial<BracketMatch> & Pick<BracketMatch, 'id' | 'status'>): BracketMatch => ({
  round: 1,
  matchNumber: 1,
  team1: team('t1', 'Alpha'),
  team2: team('t2', 'Beta'),
  winner: null,
  score: null,
  team1_score: null,
  team2_score: null,
  ...overrides,
});

describe('matchRoomLifecycle', () => {
  it('treats pending and in_progress as playable', () => {
    expect(isPlayableMatchStatus('pending')).toBe(true);
    expect(isPlayableMatchStatus('in_progress')).toBe(true);
    expect(isPlayableMatchStatus('completed')).toBe(false);
  });

  it('advances captain off a completed URL match to the next playable match', () => {
    const matches = [
      mkMatch({ id: 'db-m1', status: 'completed', round: 1, winner: team('t1', 'Alpha'), team1_score: 2 }),
      mkMatch({ id: 'db-m2', status: 'pending', round: 2, matchNumber: 2 }),
    ];

    const result = resolveActiveMatch({
      matches,
      userTeamId: 't1',
      urlMatchId: 'm1',
      canManageMatchRoom: false,
      isOrganizerMatchView: false,
    });

    expect(result.shouldUnpinUrl).toBe(true);
    expect(result.activeMatch?.id).toBe('db-m2');
    expect(result.urlCompletedMatch?.id).toBe('db-m1');
  });

  it('pins captain to URL match while still playable', () => {
    const matches = [mkMatch({ id: 'db-m1', status: 'in_progress' })];

    const result = resolveActiveMatch({
      matches,
      userTeamId: 't1',
      urlMatchId: 'm1',
      canManageMatchRoom: false,
      isOrganizerMatchView: false,
    });

    expect(result.shouldUnpinUrl).toBe(false);
    expect(result.activeMatch?.id).toBe('db-m1');
  });

  it('organizer deep link stays on focus match even when completed', () => {
    const focus = mkMatch({
      id: 'db-m1',
      status: 'completed',
      winner: team('t1', 'Alpha'),
      team1_score: 2,
      team2_score: 0,
    });

    const result = resolveActiveMatch({
      matches: [focus],
      urlMatchId: 'm1',
      focusMatch: focus,
      canManageMatchRoom: true,
      isOrganizerMatchView: true,
    });

    expect(result.activeMatch?.id).toBe('db-m1');
    expect(result.shouldUnpinUrl).toBe(false);
  });

  it('findNextTeamMatch returns earliest playable by round', () => {
    const matches = [
      mkMatch({ id: 'db-m3', status: 'pending', round: 3 }),
      mkMatch({ id: 'db-m2', status: 'in_progress', round: 2, matchNumber: 2 }),
      mkMatch({ id: 'db-m1', status: 'completed', round: 1 }),
    ];

    expect(findNextTeamMatch(matches, 't1')?.id).toBe('db-m2');
  });

  it('isBracketMatchSettled uses winner object and room phase', () => {
    const completed = mkMatch({
      id: 'db-m1',
      status: 'completed',
      winner: team('t1', 'Alpha'),
      team1_score: 2,
    });

    expect(isBracketMatchSettled(completed)).toBe(true);
    expect(isBracketMatchSettled(completed, 'completed')).toBe(true);
    expect(isBracketMatchSettled(mkMatch({ id: 'db-x', status: 'in_progress' }), 'completed')).toBe(true);
  });
});
