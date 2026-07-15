import { describe, expect, it } from 'vitest';
import type { BracketMatch } from '@/types/bracketTypes';
import {
  compareBracketMatchesDesc,
  didTeamWinBracketMatch,
  findLatestCompletedTeamMatch,
  formatTeamMatchHistoryLabel,
  isChampionshipBracketMatch,
} from './bracketMatchProgress';

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
  bracketSide: 'winners',
  ...overrides,
});

describe('bracketMatchProgress', () => {
  it('orders by round before match number (4-team single elim)', () => {
    const semi = mkMatch({ id: 'semi', status: 'completed', round: 1, matchNumber: 2 });
    const final = mkMatch({ id: 'final', status: 'completed', round: 2, matchNumber: 1 });

    expect(compareBracketMatchesDesc(semi, final)).toBeGreaterThan(0);
    expect(compareBracketMatchesDesc(final, semi)).toBeLessThan(0);
  });

  it('findLatestCompletedTeamMatch returns the final after a semi win', () => {
    const matches = [
      mkMatch({
        id: 'semi',
        status: 'completed',
        round: 1,
        matchNumber: 1,
        winner: team('t1', 'Alpha'),
        team1_score: 2,
        team2_score: 0,
      }),
      mkMatch({
        id: 'final',
        status: 'completed',
        round: 2,
        matchNumber: 1,
        winner: team('t1', 'Alpha'),
        team1_score: 2,
        team2_score: 1,
      }),
    ];

    expect(findLatestCompletedTeamMatch(matches, 't1')?.id).toBe('final');
  });

  it('detects single-elim championship on the highest round', () => {
    const matches = [
      mkMatch({ id: 'semi', status: 'completed', round: 1, matchNumber: 1 }),
      mkMatch({ id: 'final', status: 'completed', round: 2, matchNumber: 1 }),
    ];

    expect(isChampionshipBracketMatch(matches[0], matches)).toBe(false);
    expect(isChampionshipBracketMatch(matches[1], matches)).toBe(true);
  });

  it('labels finals distinctly when match_number resets each round', () => {
    const matches = [
      mkMatch({ id: 'semi', status: 'completed', round: 1, matchNumber: 1 }),
      mkMatch({ id: 'final', status: 'completed', round: 2, matchNumber: 1 }),
    ];

    expect(formatTeamMatchHistoryLabel(matches[0], matches)).toBe('Semi-Finals · Match 1');
    expect(formatTeamMatchHistoryLabel(matches[1], matches)).toBe('Finals');
  });

  it('didTeamWinBracketMatch falls back to series score when winner is unset', () => {
    const match = mkMatch({
      id: 'final',
      status: 'completed',
      round: 2,
      matchNumber: 1,
      winner: null,
      team1_score: 2,
      team2_score: 0,
    });

    expect(didTeamWinBracketMatch(match, 't1')).toBe(true);
    expect(didTeamWinBracketMatch(match, 't2')).toBe(false);
  });
});
