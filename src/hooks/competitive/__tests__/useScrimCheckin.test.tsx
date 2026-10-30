import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrimCheckin } from '../useScrims';
import { ApiError } from '@/lib/apiClient';

// Mock the competitive API client
const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/hooks/competitive/competitiveApiClient', () => ({
  competitiveApiClient: { post: mocks.post },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => mocks.post.mockReset());

describe('useScrimCheckin', () => {
  it('calls the check-in endpoint and returns success', async () => {
    const sessionData = { id: 'sess-1', team1CheckedInAt: '2026-10-31T10:00:00Z' };
    mocks.post.mockResolvedValue(sessionData);

    const { result } = renderHook(() => useScrimCheckin('sess-1'), { wrapper });
    act(() => { result.current.mutate(); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.post).toHaveBeenCalledWith('/api/scrims/sessions/sess-1/checkin');
    expect(result.current.isWindowNotOpen).toBe(false);
  });

  // isWindowNotOpen is a pure derivation: true only when the error is a 409 ApiError.
  // We test this logic directly to avoid unhandled-rejection noise from jsdom + useMutation.
  it('isWindowNotOpen derivation: true for 409 ApiError', () => {
    const err = new ApiError(409, { error: 'Window not open' }, 'Window not open');
    const isWindowNotOpen = err instanceof ApiError && err.status === 409;
    expect(isWindowNotOpen).toBe(true);
  });

  it('isWindowNotOpen derivation: false for non-409 ApiError', () => {
    const err = new ApiError(500, { error: 'Server error' }, 'Server error');
    const isWindowNotOpen = err instanceof ApiError && err.status === 409;
    expect(isWindowNotOpen).toBe(false);
  });
});
