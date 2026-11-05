import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SquadUpAdminPage from './SquadUpAdminPage';

const perms = vi.hoisted(() => ({ set: new Set<string>() }));
const end = vi.hoisted(() => ({ mutate: vi.fn() }));
const toggle = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => ({ can: (p: string) => perms.set.has(p) }) }));
vi.mock('@/hooks/competitive/useSquadUpAdmin', () => ({
  useSquadUpAdminOverview: () => ({
    isLoading: false, isError: false, data: {
      flag: { id: 'f1', enabled: true }, live: { activePlayers: 4, byRegion: [{ region: 'na', players: 4, avgTier: 15 }] },
      totals: { days: 14, sessionsStarted: 20, swipesRight: 50, swipesLeft: 70, matches: 10, matchRate: 20 },
      series: [{ day: '2026-11-05', sessionsStarted: 5, swipesRight: 10, swipesLeft: 20, matches: 2 }],
    },
  }),
  useSquadUpAdminSessions: () => ({ isError: false, data: [{ userId: 'u1', username: 'Ace', region: 'na', competitiveTier: 15, micOn: true, slotsNeeded: 2, startedAt: '2026-11-05T10:00:00Z', lastHeartbeat: '2026-11-05T10:01:00Z', likesSent: 3, passesSent: 4 }] }),
  useSquadUpAdminMatches: () => ({ data: [] }),
  useEndSquadUpSessionAdmin: () => ({ ...end, isPending: false, isError: false }),
  useToggleSquadUpFlag: () => ({ ...toggle, isPending: false, isError: false }),
}));

describe('SquadUpAdminPage', () => {
  beforeEach(() => { end.mutate.mockClear(); toggle.mutate.mockClear(); perms.set = new Set(); });

  it('denies access without squad_up:view', () => {
    render(<SquadUpAdminPage />);
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  it('shows stats read-only for a viewer: no end button, switch disabled', () => {
    perms.set = new Set(['squad_up:view']);
    render(<SquadUpAdminPage />);
    expect(screen.getByText('Match rate').nextSibling).toHaveTextContent('20%');
    expect(screen.getByText('Ace')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'End session' })).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Squad Up feature' })).toBeDisabled();
  });

  it('lets a manager end a session only after confirming, and a flag admin toggle the feature', () => {
    perms.set = new Set(['squad_up:view', 'squad_up:manage', 'feature_flags:toggle']);
    render(<SquadUpAdminPage />);
    fireEvent.click(screen.getByRole('button', { name: 'End session' }));
    expect(end.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'End session' }).at(-1)!);
    expect(end.mutate).toHaveBeenCalledWith('u1');
    fireEvent.click(screen.getByRole('switch', { name: 'Squad Up feature' }));
    expect(toggle.mutate).toHaveBeenCalledWith({ flagId: 'f1', enabled: false });
  });
});
