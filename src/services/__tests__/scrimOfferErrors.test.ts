import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import { offerActionError } from '../scrimOfferErrors';
import { parseMembersPreview } from '../scrimUtils';

const err = (status: number, body: unknown = null) => new ApiError(status, body, 'x');

describe('offerActionError', () => {
  it('explains the permission rule on 403, per action', () => {
    expect(offerActionError(err(403), 'accept')).toBe('Only a team captain or manager can accept offers.');
    expect(offerActionError(err(403), 'decline')).toBe('Only a team captain or manager can decline offers.');
    expect(offerActionError(err(403), 'withdraw')).toBe('Only a team captain or manager can withdraw this offer.');
  });

  it('tells the captain to pick another time on a slot conflict', () => {
    expect(offerActionError(err(409), 'accept')).toMatch(/another time/i);
  });

  it('prefers the server message for a bad time, with a sensible fallback', () => {
    expect(offerActionError(err(400, { error: 'Outside the window.' }), 'accept')).toBe('Outside the window.');
    expect(offerActionError(err(400), 'accept')).toMatch(/availability window/i);
  });

  it('falls back to a retry message when the server gives no usable detail', () => {
    expect(offerActionError(err(500), 'withdraw')).toBe('Could not withdraw offer. Try again.');
  });

  it('follows the shared helper for non-API errors (e.g. network failures)', () => {
    expect(offerActionError(new Error('Failed to fetch'), 'decline')).toBe('Failed to fetch');
    expect(offerActionError('weird', 'decline')).toBe('Could not decline offer. Try again.');
  });
});

describe('parseMembersPreview', () => {
  it('parses the JSON string the API sends', () => {
    const raw = JSON.stringify([{ username: 'a', avatar_seed: 's', rank_tier_key: 'gold' }]);
    expect(parseMembersPreview(raw)).toEqual([{ username: 'a', avatarSeed: 's', rankTierKey: 'gold' }]);
  });
  it('is empty for missing, invalid or non-array input', () => {
    expect(parseMembersPreview(null)).toEqual([]);
    expect(parseMembersPreview('not json')).toEqual([]);
    expect(parseMembersPreview('{"a":1}')).toEqual([]);
  });
  it('tolerates already camelCased members and drops nameless ones', () => {
    const raw = JSON.stringify([{ username: 'b', avatarSeed: 'x', rankTierKey: null }, { avatar_seed: 'y' }]);
    expect(parseMembersPreview(raw)).toEqual([{ username: 'b', avatarSeed: 'x', rankTierKey: null }]);
  });
});
