import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import { queueStartErrorMessage, queueSwipeErrorMessage } from './lfgQueueErrors';

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } } }));

describe('Queue Now error messages', () => {
  it('explains each reason joining the queue can be refused', () => {
    expect(queueStartErrorMessage(new ApiError(422, { error: 'RIOT_NOT_LINKED' }, 'x'))).toMatch(/Link your Riot account/);
    expect(queueStartErrorMessage(new ApiError(422, { error: 'NOT_RANKED' }, 'x'))).toMatch(/ranked/);
    expect(queueStartErrorMessage(new ApiError(422, { error: 'REGION_UNKNOWN' }, 'x'))).toMatch(/region/);
    expect(queueStartErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('explains swipes that fail because someone left', () => {
    expect(queueSwipeErrorMessage(new ApiError(404, { error: 'TARGET_NOT_ACTIVE' }, 'x'))).toMatch(/left the queue/);
    expect(queueSwipeErrorMessage(new ApiError(404, { error: 'NO_ACTIVE_SESSION' }, 'x'))).toMatch(/session ended/);
    expect(queueSwipeErrorMessage('weird')).toMatch(/did not go through/);
  });
});
