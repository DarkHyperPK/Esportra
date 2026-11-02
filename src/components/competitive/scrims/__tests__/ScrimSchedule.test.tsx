import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@/lib/apiClient';
import type { ScrimSession } from '@/types/competitive';

const proposeMutate = vi.fn();
const acceptMutate = vi.fn();
const declineMutate = vi.fn();
const withdrawMutate = vi.fn();
const resetMutate = vi.fn();

vi.mock('@/hooks/competitive/useScrimSchedule', () => ({
  useProposeTime: () => ({ mutateAsync: proposeMutate, isPending: false }),
  useAcceptTimeProposal: () => ({ mutateAsync: acceptMutate, isPending: false }),
  useDeclineTimeProposal: () => ({ mutateAsync: declineMutate, isPending: false }),
  useWithdrawTimeProposal: () => ({ mutateAsync: withdrawMutate, isPending: false }),
  useResetScrimTime: () => ({ mutateAsync: resetMutate, isPending: false }),
}));

import { ScrimSchedulePanel } from '../room/ScrimSchedulePanel';

const future = new Date(Date.now() + 2 * 86_400_000).toISOString();
const session = (over: Partial<ScrimSession> = {}): ScrimSession => ({
  id: 's1', team1Id: 'me', team2Id: 'them', status: 'scheduled', scheduledAt: null, timeProposal: null,
  team1CheckedInAt: null, team2CheckedInAt: null, ...over,
} as ScrimSession);
const theirs = { id: 'p1', sessionId: 's1', proposedByTeamId: 'them', proposedAt: future, note: 'Haven?', status: 'pending' as const, createdAt: future };
const mine = { ...theirs, proposedByTeamId: 'me', note: null };

const panel = (s: ScrimSession, isStaff = true) =>
  render(<ScrimSchedulePanel session={s} myTeamId="me" opponentName="Nova" isStaff={isStaff} />);

beforeEach(() => {
  proposeMutate.mockReset().mockResolvedValue({});
  acceptMutate.mockReset().mockResolvedValue({});
  declineMutate.mockReset().mockResolvedValue({});
  withdrawMutate.mockReset().mockResolvedValue({});
  resetMutate.mockReset().mockResolvedValue({});
});

describe('ScrimSchedulePanel: nobody has proposed', () => {
  it('offers one-tap evening times and sends exactly the one picked', async () => {
    panel(session());
    expect(screen.getByText(/no time set yet/i)).toBeInTheDocument();
    const chips = within(screen.getByRole('group', { name: 'Suggested times' })).getAllByRole('button');
    expect(chips.length).toBeGreaterThanOrEqual(6);
    // Nothing is sent until the captain presses the button.
    fireEvent.click(chips[0]);
    expect(proposeMutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Propose / }));
    await waitFor(() => expect(proposeMutate).toHaveBeenCalledTimes(1));
    expect(typeof proposeMutate.mock.calls[0][0].proposedAt).toBe('string');
  });

  it('keeps the button disabled until a time is chosen', () => {
    panel(session());
    expect(screen.getByRole('button', { name: 'Pick a time' })).toBeDisabled();
  });

  it('sends the optional note along', async () => {
    panel(session());
    fireEvent.click(within(screen.getByRole('group', { name: 'Suggested times' })).getAllByRole('button')[0]);
    fireEvent.change(screen.getByPlaceholderText(/haven and ascent/i), { target: { value: 'Bo3 please' } });
    fireEvent.click(screen.getByRole('button', { name: /^Propose / }));
    await waitFor(() => expect(proposeMutate).toHaveBeenCalled());
    expect(proposeMutate.mock.calls[0][0].note).toBe('Bo3 please');
  });

  it('explains a server rejection and lets the captain try again', async () => {
    proposeMutate.mockRejectedValue(new ApiError(409, { error: 'Check-in has started, so the time can\'t change now.' }, 'x'));
    panel(session());
    fireEvent.click(within(screen.getByRole('group', { name: 'Suggested times' })).getAllByRole('button')[0]);
    fireEvent.click(screen.getByRole('button', { name: /^Propose / }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/check-in has started/i);
  });
});

describe('ScrimSchedulePanel: their proposal', () => {
  it('shows their time and note, and accepts with one tap', async () => {
    panel(session({ timeProposal: theirs }));
    expect(screen.getByText('Nova proposed')).toBeInTheDocument();
    expect(screen.getByText(/Haven\?/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept this time' }));
    await waitFor(() => expect(acceptMutate).toHaveBeenCalledTimes(1));
  });

  it('declines, or counters with another time', async () => {
    panel(session({ timeProposal: theirs }));
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(declineMutate).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Suggest another' }));
    expect(screen.getByRole('group', { name: 'Suggested times' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept this time' })).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: 'Suggested times' })).getAllByRole('button')[0]);
    fireEvent.click(screen.getByRole('button', { name: /^Suggest / }));
    await waitFor(() => expect(proposeMutate).toHaveBeenCalledTimes(1));
  });

  it('shows a failure to accept and stays put', async () => {
    acceptMutate.mockRejectedValue(new ApiError(409, { error: 'That time has passed. Propose a new one.' }, 'x'));
    panel(session({ timeProposal: theirs }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept this time' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/that time has passed/i);
  });
});

describe('ScrimSchedulePanel: my proposal', () => {
  it('waits without offering to accept my own proposal, but lets me change it', () => {
    panel(session({ timeProposal: mine }));
    expect(screen.getByText(/waiting for nova to answer/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept this time' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Propose a different time' }));
    expect(screen.getByRole('group', { name: 'Suggested times' })).toBeInTheDocument();
  });
});

describe('ScrimSchedulePanel: a time is already set', () => {
  it('shows the match time and lets a captain change it', () => {
    panel(session({ scheduledAt: future }));
    expect(screen.getByText('Match time')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change the time' })).toBeInTheDocument();
  });

  it('freezes the time once check-in has started', () => {
    panel(session({ scheduledAt: future, team1CheckedInAt: future }));
    expect(screen.queryByRole('button', { name: 'Change the time' })).not.toBeInTheDocument();
    expect(screen.getByText('Match time')).toBeInTheDocument();
  });

  it('shows the time but no controls to someone who cannot manage the match', () => {
    panel(session({ scheduledAt: future }), false);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no time and nothing the viewer can do', () => {
    const { container } = panel(session(), false);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ScrimSchedulePanel: taking a time back', () => {
  it('lets me withdraw my own pending proposal', async () => {
    panel(session({ timeProposal: mine }));
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    await waitFor(() => expect(withdrawMutate).toHaveBeenCalledTimes(1));
  });

  it('asks before clearing an agreed time, and only then clears it', async () => {
    panel(session({ scheduledAt: future }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear the time' }));
    expect(resetMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/Clear this time\?/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, clear it' }));
    await waitFor(() => expect(resetMutate).toHaveBeenCalledTimes(1));
  });

  it('keeps the time when I change my mind', () => {
    panel(session({ scheduledAt: future }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear the time' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(resetMutate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Clear the time' })).toBeInTheDocument();
  });
});
