import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrimSlots, useBookScrimSlot } from '../useScrims';
import { ApiError } from '@/lib/apiClient';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/hooks/competitive/competitiveApiClient', () => ({
  competitiveApiClient: { get: mocks.get, post: mocks.post },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => { mocks.get.mockReset(); mocks.post.mockReset(); });

const availableSlot = {
  id: 'slot-1', listingId: 'list-1',
  startsAt: '2026-11-03T19:00:00Z', endsAt: '2026-11-03T20:00:00Z',
  status: 'available', createdAt: '2026-10-31T00:00:00Z',
};

const bookedSlot = { ...availableSlot, id: 'slot-2', status: 'booked', bookedByTeamId: 'team-x' };

describe('useScrimSlots', () => {
  it('returns slot list with available and booked slots', async () => {
    mocks.get.mockResolvedValue([availableSlot, bookedSlot]);
    const { result } = renderHook(() => useScrimSlots('list-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].status).toBe('available');
    expect(result.current.data![1].status).toBe('booked');
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useScrimSlots('list-1', false), { wrapper });
    expect(mocks.get).not.toHaveBeenCalled();
  });
});

describe('useBookScrimSlot', () => {
  it('submits offer with slot_id and proposed_at', async () => {
    mocks.post.mockResolvedValue({ id: 'offer-1', status: 'pending' });
    const { result } = renderHook(() => useBookScrimSlot('list-1'), { wrapper });
    act(() => {
      result.current.mutate({
        offeringTeamId: 'team-1',
        slotId: 'slot-1',
        proposedAt: availableSlot.startsAt,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.post).toHaveBeenCalledWith('/api/scrims/listings/list-1/offer', expect.objectContaining({
      slotId: 'slot-1',
      proposedAt: availableSlot.startsAt,
    }));
  });

  it('propagates 409 so the component can show the race error message', async () => {
    mocks.post.mockRejectedValue(new ApiError(409, { error: 'Slot already booked' }, 'Slot already booked'));
    const { result } = renderHook(() => useBookScrimSlot('list-1'), { wrapper });
    act(() => {
      result.current.mutate({ offeringTeamId: 'team-1', slotId: 'slot-1', proposedAt: availableSlot.startsAt });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(409);
  });
});
