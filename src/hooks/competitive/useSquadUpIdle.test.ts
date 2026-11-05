import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTIVITY_PING_MS, IDLE_PROMPT_MS, useSquadUpIdle } from './useSquadUpIdle';

describe('useSquadUpIdle', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
  afterEach(() => { vi.useRealTimers(); });

  it('asks "Still looking?" after 8 quiet minutes and clears on activity', () => {
    const ping = vi.fn();
    const { result } = renderHook(() => useSquadUpIdle(true, ping));
    act(() => { vi.advanceTimersByTime(IDLE_PROMPT_MS - 30_000); });
    expect(result.current.prompt).toBe(false);
    act(() => { vi.advanceTimersByTime(45_000); });
    expect(result.current.prompt).toBe(true);
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown')); });
    expect(result.current.prompt).toBe(false);
  });

  it('reports page activity to the server at most every 2 minutes', () => {
    const ping = vi.fn();
    renderHook(() => useSquadUpIdle(true, ping));
    act(() => { window.dispatchEvent(new Event('pointerdown')); });
    expect(ping).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(ACTIVITY_PING_MS); window.dispatchEvent(new Event('pointerdown')); });
    expect(ping).toHaveBeenCalledTimes(1);
    act(() => { window.dispatchEvent(new Event('pointerdown')); });
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it('does nothing while the player is not live', () => {
    const ping = vi.fn();
    const { result } = renderHook(() => useSquadUpIdle(false, ping));
    act(() => { vi.advanceTimersByTime(IDLE_PROMPT_MS * 2); });
    expect(result.current.prompt).toBe(false);
  });
});
