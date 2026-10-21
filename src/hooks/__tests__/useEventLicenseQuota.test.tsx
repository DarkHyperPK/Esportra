import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventLicenseQuota } from '../useEventLicenseQuota';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ apiClient: { get: mocks.get } }));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  mocks.get.mockReset();
  // Suppress TanStack Query's console.error for expected error tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('useEventLicenseQuota', () => {
  it('returns quota data when the API succeeds', async () => {
    const quota = {
      usedThisMonth: 1,
      monthlyLimit: 2,
      resetsAt: '2026-11-01T00:00:00Z',
      isOrganizerPro: false,
    };
    mocks.get.mockResolvedValue(quota);

    const { result } = renderHook(() => useEventLicenseQuota(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.quota.usedThisMonth).toBe(1);
    expect(result.current.quota.monthlyLimit).toBe(2);
    expect(result.current.isOrganizerPro).toBe(false);
  });

  it('fails open on network error — isOrganizerPro is true before load', () => {
    mocks.get.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useEventLicenseQuota(), {
      wrapper: makeWrapper(),
    });

    // Before data resolves, fail-open: isOrganizerPro defaults to true
    expect(result.current.isOrganizerPro).toBe(true);
  });

  it('fails open after error — isOrganizerPro stays true, organizer is never blocked', async () => {
    mocks.get.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useEventLicenseQuota(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.quota).toBeDefined());
    // No data loaded — fail-open returns true
    expect(result.current.isOrganizerPro).toBe(true);
  });

  it('exposes isOrganizerPro=true when API returns true', async () => {
    mocks.get.mockResolvedValue({
      usedThisMonth: 0,
      monthlyLimit: 2,
      resetsAt: '2026-11-01T00:00:00Z',
      isOrganizerPro: true,
    });

    const { result } = renderHook(() => useEventLicenseQuota(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isOrganizerPro).toBe(true);
  });
});
