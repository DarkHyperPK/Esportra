import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useTabParam } from '../useTabParam';

const TABS = ['overview', 'maps', 'players'] as const;
const at = (url: string) => ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;

function useBoth(url?: string) {
  const [tab, setTab] = useTabParam(TABS, 'overview');
  const loc = useLocation();
  return { tab, setTab, search: loc.search, url };
}

describe('useTabParam', () => {
  it('reads the tab from the URL and falls back to the default for an unknown or missing value', () => {
    expect(renderHook(() => useBoth(), { wrapper: at('/x?tab=maps') }).result.current.tab).toBe('maps');
    expect(renderHook(() => useBoth(), { wrapper: at('/x?tab=bogus') }).result.current.tab).toBe('overview');
    expect(renderHook(() => useBoth(), { wrapper: at('/x') }).result.current.tab).toBe('overview');
  });

  it('writes the tab and keeps other parameters such as team_id', () => {
    const { result } = renderHook(() => useBoth(), { wrapper: at('/x?team_id=t1') });
    act(() => result.current.setTab('players'));
    expect(result.current.tab).toBe('players');
    expect(new URLSearchParams(result.current.search).get('team_id')).toBe('t1');
    expect(new URLSearchParams(result.current.search).get('tab')).toBe('players');
  });

  it('leaves the URL clean when going back to the default tab', () => {
    const { result } = renderHook(() => useBoth(), { wrapper: at('/x?team_id=t1&tab=maps') });
    act(() => result.current.setTab('overview'));
    expect(result.current.search).toBe('?team_id=t1');
  });
});
