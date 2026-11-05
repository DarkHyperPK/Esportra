import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SquadUpAdminPage from './SquadUpAdminPage';

const perms = vi.hoisted(() => ({ set: new Set<string>() }));
const end = vi.hoisted(() => ({ mutate: vi.fn() }));
const toggle = vi.hoisted(() => ({ mutate: vi.fn() }));
const closeLobby = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => ({ can: (p: string) => perms.set.has(p) }) }));
vi.mock('@/hooks/competitive/useSquadUpAdmin', () => ({
  useSquadUpAdminOverview: () => ({
    isLoading: false, isError: false, data: {
      flag: { id: 'f1', enabled: true }, live: { activePlayers: 4, byRegion: [{ region: 'na', players: 4, avgTier: 15 }] },
      totals: { days: 14, sessionsStarted: 20, swipesRight: 50, swipesLeft: 70, matches: 10, matchRate: 20 },
      series: [{ day: '2026-11-05', sessionsStarted: 5, swipesRight: 10, swipesLeft: 20, matches: 2 }],
    },
  }),
  useSquadUpAdminSessions: () => ({ isError: false, data: [{ userId: 'u1', username: 'Ace', region: 'na', competitiveTier: 15, micOn: true, slotsNeeded: 2, startedAt: '2026-11-05T10:00:00Z', lastHeartbeat: '2026-11-05T10:01:00Z', likesSent: 3, passesSent: 4 }, { userId: 'u2', username: 'Newbie', region: 'ap', competitiveTier: null, mode: 'unrated', countryCode: 'PK', micOn: false, slotsNeeded: 1, startedAt: '2026-11-05T10:00:00Z', lastHeartbeat: '2026-11-05T10:01:00Z', likesSent: 0, passesSent: 0 }] }),
  useSquadUpAdminMatches: () => ({ data: [] }),
  useEndSquadUpSessionAdmin: () => ({ ...end, isPending: false, isError: false }),
  useToggleSquadUpFlag: () => ({ ...toggle, isPending: false, isError: false }),
  useSquadUpAdminLobbies: () => ({ isError: false, data: [{ id: 'l1', hostId: 'h1', hostUsername: 'Host', title: 'Need 2 for comp', mode: 'competitive', region: 'ap', countryCode: 'PK', openSlots: 4, status: 'open', createdAt: '2026-11-05T10:00:00Z', acceptedCount: 2, pendingCount: 1 }] }),
  useCloseSquadUpLobbyAdmin: () => ({ ...closeLobby, isPending: false, isError: false }),
}));

describe('SquadUpAdminPage', () => {
  beforeEach(() => { end.mutate.mockClear(); toggle.mutate.mockClear(); closeLobby.mutate.mockClear(); perms.set = new Set(); });

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
    fireEvent.click(screen.getAllByRole('button', { name: 'End session' })[0]);
    expect(end.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'End session' }).at(-1)!);
    expect(end.mutate).toHaveBeenCalledWith('u1');
    fireEvent.click(screen.getByRole('switch', { name: 'Squad Up feature' }));
    expect(toggle.mutate).toHaveBeenCalledWith({ flagId: 'f1', enabled: false });
  });

  it('shows unranked Unrated sessions with mode and country', () => {
    perms.set = new Set(['squad_up:view']);
    render(<SquadUpAdminPage />);
    const row = screen.getByText('Newbie').closest('tr');
    expect(row).toHaveTextContent('unrated');
    expect(row).toHaveTextContent('PK');
    expect(row).toHaveTextContent('Unranked');
  });

  it('lists lobbies and lets a manager close one after confirming', () => {
    perms.set = new Set(['squad_up:view', 'squad_up:manage']);
    render(<SquadUpAdminPage />);
    fireEvent.click(screen.getByRole('tab', { name: /Lobbies/ }));
    expect(screen.getByText('Need 2 for comp')).toBeInTheDocument();
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(closeLobby.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close lobby' }));
    expect(closeLobby.mutate).toHaveBeenCalledWith('l1');
  });

  it('hides the close action from a viewer', () => {
    perms.set = new Set(['squad_up:view']);
    render(<SquadUpAdminPage />);
    fireEvent.click(screen.getByRole('tab', { name: /Lobbies/ }));
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});
