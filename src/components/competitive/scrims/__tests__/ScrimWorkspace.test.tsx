import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '@/lib/apiClient';
import type { ScrimOffer, ScrimSession } from '@/types/competitive';

const acceptMutate = vi.fn();
const declineMutate = vi.fn();
const cancelMutate = vi.fn();

vi.mock('@/hooks/competitive/useScrims', () => ({
  useAcceptOffer: () => ({ mutateAsync: acceptMutate, isPending: false }),
  useDeclineOffer: () => ({ mutateAsync: declineMutate, isPending: false }),
  useWithdrawOffer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCancelScrimSession: () => ({ mutateAsync: cancelMutate, isPending: false }),
}));
vi.mock('@/hooks/useGameCatalogContext', () => ({
  useGameCatalogContext: () => ({ games: [{ slug: 'valorant', name: 'Valorant', logo: null, icon: null }] }),
}));

import { ReceivedOfferCard } from '../workspace/ReceivedOfferCard';
import { AgendaRow } from '../workspace/AgendaRow';
import { ScrimAgenda } from '../workspace/ScrimAgenda';
import { ScrimHistory } from '../workspace/ScrimHistory';
import { UpNextList } from '../workspace/UpNextList';

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

const offer = (over: Partial<ScrimOffer> = {}): ScrimOffer => ({
  id: 'o1',
  listingId: 'l1',
  offeringTeamId: 'tt-nova',
  offeringTeamName: 'Nova',
  status: 'pending',
  proposedAt: new Date(2026, 10, 3, 20, 0).toISOString(),
  listingGameSlug: 'valorant',
  ...over,
} as ScrimOffer);

const session = (over: Partial<ScrimSession> = {}): ScrimSession => ({
  id: 's1',
  team1Id: 'me',
  team2Id: 'them',
  team1Name: 'Mine',
  team2Name: 'Nova',
  gameSlug: 'valorant',
  status: 'scheduled',
  scheduledAt: new Date(Date.now() + 3 * 3_600_000).toISOString(),
  resultReportedByTeam1: false,
  resultReportedByTeam2: false,
  team1Score: null,
  team2Score: null,
  ...over,
} as ScrimSession);

beforeEach(() => {
  acceptMutate.mockReset().mockResolvedValue({});
  declineMutate.mockReset().mockResolvedValue({});
  cancelMutate.mockReset().mockResolvedValue({});
});

describe('ReceivedOfferCard', () => {
  it('asks for a time before accepting, then sends it', async () => {
    wrap(<ReceivedOfferCard offer={offer()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(acceptMutate).not.toHaveBeenCalled();

    const input = screen.getByLabelText(/confirm time/i) as HTMLInputElement;
    expect(input.value).toBe('2026-11-03T20:00'); // local time, not UTC
    fireEvent.click(screen.getByRole('button', { name: /confirm scrim/i }));

    await waitFor(() => expect(acceptMutate).toHaveBeenCalledTimes(1));
    expect(acceptMutate.mock.calls[0][0]).toEqual({ scheduled_at: new Date(2026, 10, 3, 20, 0).toISOString() });
  });

  it('lets you back out of accepting', () => {
    wrap(<ReceivedOfferCard offer={offer()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByLabelText(/confirm time/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
  });

  it('shows a clear message when the slot was just taken', async () => {
    acceptMutate.mockRejectedValue(new ApiError(409, null, 'conflict'));
    wrap(<ReceivedOfferCard offer={offer()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    fireEvent.click(screen.getByRole('button', { name: /confirm scrim/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/another time/i);
  });

  it('declines without a time step and explains a permission error', async () => {
    declineMutate.mockRejectedValue(new ApiError(403, null, 'no'));
    wrap(<ReceivedOfferCard offer={offer()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/captain or manager can decline/i);
  });

  it('shows no actions for an offer that is no longer pending', () => {
    wrap(<ReceivedOfferCard offer={offer({ status: 'declined' })} />);
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
  });
});

describe('AgendaRow', () => {
  it('shows the opponent, the next step and a room link', () => {
    wrap(<ul><AgendaRow session={session()} teamId="me" /></ul>);
    expect(screen.getByText('vs Nova')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open room' })).toHaveAttribute('href', '/competitive/scrims/sessions/s1');
  });

  it('turns the link into the action when check-in is open', () => {
    wrap(<ul><AgendaRow session={session({ scheduledAt: new Date(Date.now() + 5 * 60_000).toISOString() })} teamId="me" /></ul>);
    expect(screen.getByRole('link', { name: 'Check in' })).toBeInTheDocument();
  });

  it('needs two steps to cancel, and Keep it backs out', async () => {
    wrap(<ul><AgendaRow session={session()} teamId="me" /></ul>);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancelMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(screen.queryByText(/can.t be undone/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: /yes, cancel scrim/i }));
    await waitFor(() => expect(cancelMutate).toHaveBeenCalledTimes(1));
  });

  it('keeps the confirm open and shows the error if cancelling fails', async () => {
    cancelMutate.mockRejectedValue(new ApiError(500, null, 'x'));
    wrap(<ul><AgendaRow session={session()} teamId="me" /></ul>);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: /yes, cancel scrim/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not cancel/i);
    expect(screen.getByRole('button', { name: /yes, cancel scrim/i })).toBeInTheDocument();
  });

  it('offers no cancel once a scrim is live', () => {
    wrap(<ul><AgendaRow session={session({ status: 'in_progress' })} teamId="me" /></ul>);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Report result' })).toBeInTheDocument();
  });
});

describe('ScrimAgenda', () => {
  const base = { teamId: 'me', isLoading: false, isError: false, onRetry: vi.fn(), onNewScrim: vi.fn() };

  it('shows a busy state while loading', () => {
    wrap(<ScrimAgenda {...base} sessions={[]} isLoading />);
    expect(screen.getByLabelText(/loading agenda/i)).toBeInTheDocument();
  });

  it('offers a retry on error', () => {
    const onRetry = vi.fn();
    wrap(<ScrimAgenda {...base} sessions={[]} isError onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('points an empty agenda at posting a listing or finding a scrim', () => {
    const onNewScrim = vi.fn();
    wrap(<ScrimAgenda {...base} sessions={[]} onNewScrim={onNewScrim} />);
    fireEvent.click(screen.getByRole('button', { name: 'Post a listing' }));
    expect(onNewScrim).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Find a scrim' })).toHaveAttribute('href', '/competitive/scrims');
  });

  it('groups scrims under headings, soonest first', () => {
    const live = session({ id: 'live', status: 'in_progress', team2Name: 'Live Team' });
    const later = session({ id: 'later', team2Name: 'Later Team', scheduledAt: new Date(Date.now() + 20 * 86_400_000).toISOString() });
    wrap(<ScrimAgenda {...base} sessions={[later, live]} />);
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Live and in review', 'Later']);
  });
});

describe('ScrimHistory', () => {
  const done = [
    session({ id: 'h1', status: 'completed', team1Score: 2, team2Score: 0, team2Name: 'Nova' }),
    session({ id: 'h2', status: 'completed', team1Score: 0, team2Score: 2, team2Name: 'Apex' }),
    session({ id: 'h3', status: 'cancelled', team2Name: 'Zed' }),
  ];

  it('renders nothing when there is no history', () => {
    const { container } = wrap(<ScrimHistory sessions={[]} teamId="me" defaultOpen />);
    expect(container).toBeEmptyDOMElement();
  });

  it('starts collapsed when told to, and expands on click', () => {
    wrap(<ScrimHistory sessions={done} teamId="me" defaultOpen={false} />);
    expect(screen.queryByText('vs Nova')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    expect(screen.getByText('vs Nova')).toBeInTheDocument();
  });

  it('orients results to my team and marks cancelled scrims', () => {
    wrap(<ScrimHistory sessions={done} teamId="me" defaultOpen />);
    expect(screen.getByLabelText('Win')).toBeInTheDocument();
    expect(screen.getByLabelText('Loss')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText('2 – 0')).toBeInTheDocument();
  });

  it('filters by search and says when nothing matches', () => {
    wrap(<ScrimHistory sessions={done} teamId="me" defaultOpen />);
    fireEvent.change(screen.getByLabelText(/search past scrims/i), { target: { value: 'apex' } });
    expect(screen.getByText('vs Apex')).toBeInTheDocument();
    expect(screen.queryByText('vs Nova')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/search past scrims/i), { target: { value: 'zzz' } });
    expect(screen.getByText(/no past scrims match/i)).toBeInTheDocument();
  });

  it('pages long histories', () => {
    const many = Array.from({ length: 14 }, (_, i) => session({ id: `m${i}`, status: 'completed', team1Score: 1, team2Score: 0, team2Name: `T${i}` }));
    wrap(<ScrimHistory sessions={many} teamId="me" defaultOpen />);
    expect(screen.getAllByRole('link')).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: /show 4 more/i }));
    expect(screen.getAllByRole('link')).toHaveLength(14);
  });
});

describe('UpNextList', () => {
  it('renders nothing when empty and links each action to its room', () => {
    const { container } = wrap(<UpNextList items={[]} />);
    expect(container).toBeEmptyDOMElement();

    wrap(
      <UpNextList
        items={[{
          type: 'result_to_confirm', teamId: 'me', sessionId: 's9', offerId: null, listingId: null,
          opponentName: 'Nova', opponentLogo: null, gameSlug: 'valorant', scheduledAt: null, deadline: null,
        }]}
      />,
    );
    expect(screen.getByRole('link', { name: /review result/i })).toHaveAttribute('href', '/competitive/scrims/sessions/s9');
  });
});
