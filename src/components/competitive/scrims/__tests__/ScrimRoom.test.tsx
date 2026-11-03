import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ScrimStageRail } from '../room/ScrimStageRail';
import { ScrimNextStepCard } from '../room/ScrimNextStepCard';
import { ScrimFaceOff, type FaceOffTeam } from '../room/ScrimFaceOff';

describe('ScrimStageRail', () => {
  it('marks only the active step as current and earlier steps as done', () => {
    render(<ScrimStageRail stage="live" />);
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(5);
    expect(steps[2]).toHaveAttribute('aria-current', 'step');
    expect(steps.filter((s) => s.hasAttribute('aria-current'))).toHaveLength(1);
  });

  it('shows a dispute at the result step', () => {
    render(<ScrimStageRail stage="disputed" />);
    expect(screen.getByText('Disputed')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[3]).toHaveAttribute('aria-current', 'step');
  });

  it('shows a cancelled scrim as stopped with no current step', () => {
    render(<ScrimStageRail stage="cancelled" />);
    expect(screen.getByText(/scrim was cancelled/i)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').some((s) => s.hasAttribute('aria-current'))).toBe(false);
  });

  it('shows a finished scrim with every step complete', () => {
    render(<ScrimStageRail stage="confirmed" />);
    expect(screen.getAllByRole('listitem').some((s) => s.hasAttribute('aria-current'))).toBe(false);
  });
});

describe('ScrimNextStepCard', () => {
  const urgent = { headline: 'Check in now', body: 'Check-in closes soon.', target: 'room-checkin' as const, urgent: true };

  it('sends the target id when Go is pressed', () => {
    const onGo = vi.fn();
    render(<ScrimNextStepCard view={urgent} deadline={null} onGo={onGo} />);
    fireEvent.click(screen.getByRole('button', { name: /go/i }));
    expect(onGo).toHaveBeenCalledWith('room-checkin');
  });

  it('has no button when there is nothing to do', () => {
    render(<ScrimNextStepCard view={{ headline: 'Scrim complete', body: 'Done.', target: null, urgent: false }} deadline={null} onGo={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Scrim complete' })).toBeInTheDocument();
  });

  it('counts down only while the step is urgent', () => {
    const soon = new Date(Date.now() + 5 * 60_000).toISOString();
    const { rerender } = render(<ScrimNextStepCard view={urgent} deadline={soon} onGo={vi.fn()} />);
    expect(screen.getByText(/\d+m/)).toBeInTheDocument();
    rerender(<ScrimNextStepCard view={{ ...urgent, urgent: false }} deadline={soon} onGo={vi.fn()} />);
    expect(screen.queryByText(/\d+m/)).not.toBeInTheDocument();
  });
});

describe('ScrimFaceOff', () => {
  const t = (over: Partial<FaceOffTeam>): FaceOffTeam => ({ id: over.name ?? 'Nova', name: 'Nova', logoUrl: null, isMine: false, checkedIn: false, ...over });
  const base = {
    team1: t({ name: 'Mine', isMine: true, checkedIn: true }),
    team2: t({ name: 'Nova' }),
    status: 'scheduled' as const,
    gameSlug: null,
    gameName: 'Valorant',
    bestOf: 3,
    when: 'Mon, Nov 2 · 8:00 PM',
    score: null,
    showCheckin: true,
  };

  it('shows both teams, who is mine and the series format', () => {
    render(<ScrimFaceOff {...base} />);
    expect(screen.getByText('Mine')).toBeInTheDocument();
    expect(screen.getByText('Nova')).toBeInTheDocument();
    expect(screen.getByText('Your team')).toBeInTheDocument();
    expect(screen.getByText('Opponent')).toBeInTheDocument();
    expect(screen.getByText(/first to 2/i)).toBeInTheDocument();
  });

  it('shows check-in state only while check-in is relevant', () => {
    const { rerender } = render(<ScrimFaceOff {...base} />);
    expect(screen.getByText('Checked in')).toBeInTheDocument();
    expect(screen.getByText('Not yet')).toBeInTheDocument();
    rerender(<ScrimFaceOff {...base} showCheckin={false} />);
    expect(screen.queryByText('Checked in')).not.toBeInTheDocument();
  });

  it('shows the score instead of VS once a result exists', () => {
    const { rerender } = render(<ScrimFaceOff {...base} />);
    expect(screen.getByText('VS')).toBeInTheDocument();
    rerender(<ScrimFaceOff {...base} score={{ team1: 2, team2: 1 }} />);
    expect(screen.getByLabelText('Series 2 to 1')).toBeInTheDocument();
    expect(screen.queryByText('VS')).not.toBeInTheDocument();
  });
});
