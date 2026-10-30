import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ScrimCheckinPanel } from '../ScrimCheckinPanel';
import type { ScrimSession } from '@/types/competitive';

// Mock the hook
const mockMutate = vi.fn();
vi.mock('@/hooks/competitive/useScrims', () => ({
  useScrimCheckin: () => ({
    mutate: mockMutate,
    mutateAsync: mockMutate,
    isPending: false,
    isError: false,
    isWindowNotOpen: false,
    error: null,
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

const baseSession: ScrimSession = {
  id: 'sess-1',
  team1Id: 'team-1',
  team2Id: 'team-2',
  gameSlug: 'valorant',
  modeKey: null,
  scheduledAt: '2026-11-03T19:00:00Z',
  durationMinutes: 90,
  serverInfo: null,
  lobbyCode: null,
  status: 'scheduled',
  resultReportedByTeam1: false,
  resultReportedByTeam2: false,
  team1Score: null,
  team2Score: null,
  team1Name: 'Night Owls',
  team1Logo: null,
  team2Name: 'Storm Riders',
  team2Logo: null,
  checkinWindowOpenedAt: null,
  team1CheckedInAt: null,
  team2CheckedInAt: null,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

describe('ScrimCheckinPanel', () => {
  it('S1-1: shows "opens 15 minutes before" when window not open (no checkinWindowOpenedAt)', () => {
    render(
      <ScrimCheckinPanel
        session={baseSession}
        callerTeamId="team-1"
        isCaptain={true}
        onCheckinSuccess={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText(/opens 15 minutes before/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /check in your team/i })).not.toBeInTheDocument();
  });

  it('S1-6: shows cancelled message when session is cancelled', () => {
    render(
      <ScrimCheckinPanel
        session={{ ...baseSession, status: 'cancelled' }}
        callerTeamId="team-1"
        isCaptain={true}
        onCheckinSuccess={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText(/check-in timed out/i)).toBeInTheDocument();
  });

  it('S1-2: shows check-in button for captain when window is open', () => {
    const windowOpenedAt = new Date(Date.now() - 5 * 60_000).toISOString();
    render(
      <ScrimCheckinPanel
        session={{ ...baseSession, checkinWindowOpenedAt: windowOpenedAt }}
        callerTeamId="team-1"
        isCaptain={true}
        onCheckinSuccess={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByRole('button', { name: /check in your team/i })).toBeInTheDocument();
  });

  it('S1-3: shows captain message for non-captain when window is open', () => {
    const windowOpenedAt = new Date(Date.now() - 5 * 60_000).toISOString();
    render(
      <ScrimCheckinPanel
        session={{ ...baseSession, checkinWindowOpenedAt: windowOpenedAt }}
        callerTeamId="team-1"
        isCaptain={false}
        onCheckinSuccess={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText(/your captain checks the team in/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /check in your team/i })).not.toBeInTheDocument();
  });

  it('S1-5: shows both-checked-in notice when both teams checked in', () => {
    render(
      <ScrimCheckinPanel
        session={{
          ...baseSession,
          team1CheckedInAt: '2026-11-03T18:50:00Z',
          team2CheckedInAt: '2026-11-03T18:51:00Z',
        }}
        callerTeamId="team-1"
        isCaptain={true}
        onCheckinSuccess={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText(/both teams checked in/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /check in your team/i })).not.toBeInTheDocument();
  });

  it('S1-4: shows "waiting for opponent" when own team checked in', () => {
    const windowOpenedAt = new Date(Date.now() - 5 * 60_000).toISOString();
    render(
      <ScrimCheckinPanel
        session={{
          ...baseSession,
          checkinWindowOpenedAt: windowOpenedAt,
          team1CheckedInAt: '2026-11-03T18:50:00Z',
          team2CheckedInAt: null,
        }}
        callerTeamId="team-1"
        isCaptain={true}
        onCheckinSuccess={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText(/waiting for Storm Riders/i)).toBeInTheDocument();
  });

  it('S1-8: shows both status rows with team names', () => {
    render(
      <ScrimCheckinPanel
        session={baseSession}
        callerTeamId="team-1"
        isCaptain={true}
        onCheckinSuccess={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText('Night Owls')).toBeInTheDocument();
    expect(screen.getByText('Storm Riders')).toBeInTheDocument();
  });
});
