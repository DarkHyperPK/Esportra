import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminPublicVetoSessions, buildVetoSessionsPath, parseVetoSessionsResponse } from '../useAdminPublicVetoSessions';
const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ apiClient: { get: mocks.get } }));
const response = { sessions: [], page: 1, pageSize: 50, total: 0, summary: { totalSessions: 0, completedSessions: 0, overlaySessions: 0 } };
beforeEach(() => mocks.get.mockReset());
describe('admin public veto sessions', () => {
  it('validates page and game before requesting', () => {
    expect(buildVetoSessionsPath(2, 'valorant')).toBe('/api/admin/public-tools/veto-sessions?page=2&game=valorant');
    expect(() => buildVetoSessionsPath(0, 'all')).toThrow();
    expect(() => buildVetoSessionsPath(1, 'unknown')).toThrow();
  });
  it('validates API shape and strips unrecognized sensitive fields', () => {
    expect(parseVetoSessionsResponse({ ...response, overlayToken: 'private' })).toEqual(response);
    expect(() => parseVetoSessionsResponse({ ...response, pageSize: 10 })).toThrow();
  });
  it('keeps pagination filtered, resets game to page one and prevents unauthorized fetching', async () => {
    mocks.get.mockResolvedValue(response);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, rerender } = renderHook(({ enabled }) => useAdminPublicVetoSessions(enabled), { wrapper, initialProps: { enabled: false } });
    expect(mocks.get).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    act(() => result.current.setPage(2));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/admin/public-tools/veto-sessions?page=2'));
    act(() => result.current.setGame('cs2'));
    expect(result.current.page).toBe(1);
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/admin/public-tools/veto-sessions?page=1&game=cs2'));
  });
});
