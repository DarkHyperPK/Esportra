import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ScrimDisputeBanner } from '../ScrimDisputeBanner';
import type { ScrimDispute } from '@/types/competitive';

const mockSubmitMutation = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/hooks/competitive/useScrims', () => ({
  useSubmitDisputeEvidence: () => mockSubmitMutation,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

const now = new Date('2026-10-31T12:00:00Z').getTime();
vi.setSystemTime(now);

const openDispute: ScrimDispute = {
  id: 'dispute-1',
  sessionId: 'sess-1',
  raisedByTeamId: 'team-1',
  reason: 'They disconnected on purpose.',
  status: 'open',
  createdAt: '2026-10-31T10:00:00Z',
  updatedAt: '2026-10-31T10:00:00Z',
  evidenceUrls: [],
  responderEvidenceUrls: [],
  responderNotes: null,
  resolvedBy: null,
  outcome: null,
  resolutionNotes: null,
  resolvedAt: null,
};

const resolvedDispute: ScrimDispute = {
  ...openDispute,
  status: 'resolved',
  outcome: 'team1_wins',
  resolutionNotes: 'Screenshot evidence confirmed.',
  resolvedAt: '2026-10-31T11:00:00Z',
};

describe('ScrimDisputeBanner', () => {
  it('S4-0: renders nothing when dispute is null', () => {
    const { container } = render(
      <ScrimDisputeBanner
        dispute={null}
        callerTeamId="team-1"
        sessionTeam1Id="team-1"
        sessionId="sess-1"
        isCaptain={true}
        onEvidenceSubmitted={vi.fn()}
      />,
      { wrapper },
    );
    expect(container.firstChild).toBeNull();
  });

  it('S4-1: renders DISPUTE eyebrow and reason text when dispute is open', () => {
    render(
      <ScrimDisputeBanner
        dispute={openDispute}
        callerTeamId="team-1"
        sessionTeam1Id="team-1"
        sessionId="sess-1"
        isCaptain={true}
        onEvidenceSubmitted={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText('DISPUTE')).toBeInTheDocument();
    expect(screen.getByText('They disconnected on purpose.')).toBeInTheDocument();
  });

  it('S4-5: shows resolved notice with outcome label', () => {
    render(
      <ScrimDisputeBanner
        dispute={resolvedDispute}
        callerTeamId="team-1"
        sessionTeam1Id="team-1"
        sessionId="sess-1"
        isCaptain={true}
        onEvidenceSubmitted={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText('Team 1 wins')).toBeInTheDocument();
    expect(screen.getByText('Screenshot evidence confirmed.')).toBeInTheDocument();
    // DISPUTE heading must not be present when resolved
    expect(screen.queryByText('DISPUTE')).not.toBeInTheDocument();
  });

  it('UX risk 5: expand button shown for long reason text', () => {
    const longReason = 'x'.repeat(200);
    render(
      <ScrimDisputeBanner
        dispute={{ ...openDispute, reason: longReason }}
        callerTeamId="team-1"
        sessionTeam1Id="team-1"
        sessionId="sess-1"
        isCaptain={true}
        onEvidenceSubmitted={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
  });

  it('UX risk 5: expand button hidden for short reason text', () => {
    render(
      <ScrimDisputeBanner
        dispute={openDispute}
        callerTeamId="team-1"
        sessionTeam1Id="team-1"
        sessionId="sess-1"
        isCaptain={true}
        onEvidenceSubmitted={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.queryByRole('button', { name: /expand/i })).not.toBeInTheDocument();
  });

  it('S4-2: shows evidence form for responding team captain within 48h window', () => {
    // team-2 is the responding team (dispute raised by team-1)
    render(
      <ScrimDisputeBanner
        dispute={openDispute}
        callerTeamId="team-2"
        sessionTeam1Id="team-1"
        sessionId="sess-1"
        isCaptain={true}
        onEvidenceSubmitted={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText('YOUR EVIDENCE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit evidence/i })).toBeInTheDocument();
  });

  it('S4-1: does not show evidence form for the raising team', () => {
    render(
      <ScrimDisputeBanner
        dispute={openDispute}
        callerTeamId="team-1"
        sessionTeam1Id="team-1"
        sessionId="sess-1"
        isCaptain={true}
        onEvidenceSubmitted={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.queryByText('YOUR EVIDENCE')).not.toBeInTheDocument();
  });

  it('clicking Expand shows Show less toggle', () => {
    const longReason = 'y'.repeat(200);
    render(
      <ScrimDisputeBanner
        dispute={{ ...openDispute, reason: longReason }}
        callerTeamId="team-1"
        sessionTeam1Id="team-1"
        sessionId="sess-1"
        isCaptain={true}
        onEvidenceSubmitted={vi.fn()}
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: /expand/i }));
    expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument();
  });
});
