import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/apiClient';
import { useProEventRequest } from '../useProEventRequest';

vi.mock('@/lib/apiClient', () => ({ apiClient: { post: vi.fn() } }));
const details = { eventName: 'Saturday Cup', gameTitle: 'Valorant', email: 'host@example.test', startsOn: '2027-01-02', endsOn: '2027-01-03', teamCount: 64, website: '' };
const saved = { reference: 'ESP-123456781234123412341234567890AB', estimatedAmount: 12000, currency: 'PKR' };
describe('Pro event requests', () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });
  it('only shows a reference after a valid server receipt', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce(saved);
    const { result } = renderHook(useProEventRequest);
    expect(result.current.receipt).toBeNull();
    await act(() => result.current.submit(details));
    expect(result.current.receipt).toEqual(saved);
    expect(apiClient.post).toHaveBeenCalledWith('/api/pro-event-requests', expect.objectContaining({ teamCount: 64, requestId: expect.any(String) }));
  });
  it('retains idempotency on retry and never invents success on failure', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Service unavailable')).mockResolvedValueOnce(saved);
    const { result } = renderHook(useProEventRequest);
    await act(() => result.current.submit(details));
    expect(result.current.receipt).toBeNull();
    expect(result.current.error).toBe('Service unavailable');
    await act(() => result.current.submit(details));
    const calls = vi.mocked(apiClient.post).mock.calls;
    expect(calls[0][1]).toEqual(calls[1][1]);
    expect(result.current.receipt).toEqual(saved);
  });
  it('issues a new request id if corrected event details differ', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Service unavailable'));
    const { result } = renderHook(useProEventRequest);
    await act(() => result.current.submit(details));
    await act(() => result.current.submit({ ...details, teamCount: 128 }));
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).not.toEqual(vi.mocked(apiClient.post).mock.calls[1][1]);
  });
  it('rejects malformed form input without sending it', async () => {
    const { result } = renderHook(useProEventRequest);
    await act(() => result.current.submit({ ...details, email: 'bad-email' }));
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
  it('rejects malformed server responses without claiming saved status', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ success: true });
    const { result } = renderHook(useProEventRequest);
    await act(() => result.current.submit(details));
    expect(result.current.receipt).toBeNull();
    expect(result.current.error).toBeTruthy();
  });
});
