import { describe, expect, it } from 'vitest';
import { isProviderMatchSettled, presentProviderMatch, reasonText } from '../presentation';
import type { ProviderMatchDetail } from '@/types/providerMatch';

const detail = (over: Partial<ProviderMatchDetail>): ProviderMatchDetail => ({ status: 'verified', reasons: [], ...over });

describe('presentProviderMatch', () => {
  it('says nothing when no Riot match is attached', () => {
    expect(presentProviderMatch(undefined)).toBeNull();
    expect(presentProviderMatch(detail({ status: 'none' }))).toBeNull();
  });

  it('shows verified results as a success with the roster coverage', () => {
    const view = presentProviderMatch(detail({ players: [{ isRosterMember: true }, { isRosterMember: true }] }));
    expect(view).toMatchObject({ label: 'Verified by Riot', tone: 'success' });
    expect(view?.summary).toContain('2 of 2 players matched a roster');
    expect(view?.details).toEqual([]);
  });

  it('explains a partial verification in words', () => {
    const view = presentProviderMatch(detail({
      status: 'partially_verified', reasons: ['unmatched_players:2'],
      players: [{ isRosterMember: true }, { isRosterMember: false }, { isRosterMember: false }],
    }));
    expect(view?.tone).toBe('warning');
    expect(view?.details).toEqual(['2 players could not be matched to a roster member.']);
    expect(view?.summary).toContain('1 of 3');
  });

  it('flags a disagreement with Riot without claiming who is right', () => {
    const view = presentProviderMatch(detail({ status: 'disputed', reasons: ['team2_score_mismatch', 'map_mismatch'] }));
    expect(view?.tone).toBe('critical');
    expect(view?.details).toHaveLength(2);
    expect(view?.summary).toContain('Staff can review');
  });

  it('distinguishes a check still running from Riot data that never arrived', () => {
    expect(presentProviderMatch(detail({ status: 'pending' }))?.label).toBe('Checking with Riot');
    const gone = presentProviderMatch(detail({ status: 'pending', match: { dataStatus: 'unavailable' } }));
    expect(gone?.label).toBe('Riot data unavailable');
    expect(gone?.summary).toContain('stands as reported');
  });

  it('marks a reused Riot match as not counted', () => {
    expect(presentProviderMatch(detail({ status: 'duplicate' }))?.tone).toBe('critical');
  });
});

describe('reasonText', () => {
  it('uses singular and plural for unmatched players', () => {
    expect(reasonText('unmatched_players:1')).toBe('1 player could not be matched to a roster member.');
    expect(reasonText('unmatched_players:3')).toBe('3 players could not be matched to a roster member.');
  });

  it('never shows an unknown server code', () => {
    expect(reasonText('some_new_code')).toBe('One of the checks did not pass.');
  });
});

describe('isProviderMatchSettled', () => {
  it('keeps polling only while the server may still learn something', () => {
    expect(isProviderMatchSettled(undefined)).toBe(false);
    expect(isProviderMatchSettled(detail({ status: 'pending' }))).toBe(false);
    expect(isProviderMatchSettled(detail({ status: 'pending', match: { dataStatus: 'pending' } }))).toBe(false);
    expect(isProviderMatchSettled(detail({ status: 'pending', match: { dataStatus: 'failed' } }))).toBe(true);
    expect(isProviderMatchSettled(detail({ status: 'verified' }))).toBe(true);
    expect(isProviderMatchSettled(detail({ status: 'none' }))).toBe(true);
  });
});
