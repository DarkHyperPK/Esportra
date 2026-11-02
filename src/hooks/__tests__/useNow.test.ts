import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNow } from '../useNow';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-02T20:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('starts at the current time and moves forward on its interval', () => {
    const { result } = renderHook(() => useNow(1000));
    expect(result.current).toBe(Date.parse('2026-11-02T20:00:00Z'));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current).toBe(Date.parse('2026-11-02T20:00:03Z'));
  });

  it('does not tick while disabled', () => {
    const { result } = renderHook(() => useNow(1000, false));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe(Date.parse('2026-11-02T20:00:00Z'));
  });

  it('stops ticking after unmount', () => {
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useNow(1000));
    unmount();
    expect(clear).toHaveBeenCalled();
  });
});
