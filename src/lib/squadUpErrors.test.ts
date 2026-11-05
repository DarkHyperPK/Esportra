import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import { squadUpStartErrorMessage, squadUpSwipeErrorMessage } from './squadUpErrors';

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } } }));

describe('SquadUp Now error messages', () => {
  it('explains each reason joining the squadUp can be refused', () => {
    expect(squadUpStartErrorMessage(new ApiError(422, { error: 'RIOT_NOT_LINKED' }, 'x'))).toMatch(/Link your Riot account/);
    expect(squadUpStartErrorMessage(new ApiError(422, { error: 'NOT_RANKED' }, 'x'))).toMatch(/ranked/);
    expect(squadUpStartErrorMessage(new ApiError(422, { error: 'REGION_UNKNOWN' }, 'x'))).toMatch(/region/);
    expect(squadUpStartErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('explains swipes that fail because someone left', () => {
    expect(squadUpSwipeErrorMessage(new ApiError(404, { error: 'TARGET_NOT_ACTIVE' }, 'x'))).toMatch(/left Squad Up/);
    expect(squadUpSwipeErrorMessage(new ApiError(404, { error: 'NO_ACTIVE_SESSION' }, 'x'))).toMatch(/session ended/);
    expect(squadUpSwipeErrorMessage('weird')).toMatch(/did not go through/);
  });
});
