import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HubConnectionState } from '@microsoft/signalr';
import { renderHook, act } from '@testing-library/react';
import { useHubGroupJoin } from '@/hooks/useHubGroupJoin';

function createMockConnection() {
  let state = HubConnectionState.Disconnected;
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    get state() {
      return state;
    },
    setState(next: HubConnectionState) {
      state = next;
    },
    start: vi.fn(async () => {
      state = HubConnectionState.Connected;
    }),
    invoke: vi.fn(async (..._args: unknown[]) => undefined),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      const set = handlers.get(event) ?? new Set();
      set.add(handler);
      handlers.set(event, set);
    }),
    off: vi.fn(),
  };
}

describe('useHubGroupJoin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries join after connection becomes available', async () => {
    const conn = createMockConnection();
    const join = vi.fn(async () => {
      await conn.invoke('JoinMatch', 'match-1');
    });

    const { result } = renderHook(() =>
      useHubGroupJoin(conn as never, {
        enabled: true,
        join,
      }),
    );

    expect(result.current.joined).toBe(false);

    await act(async () => {
      conn.setState(HubConnectionState.Connected);
      await vi.advanceTimersByTimeAsync(1100);
    });

    expect(join).toHaveBeenCalled();
    expect(result.current.joined).toBe(true);
  });
});
