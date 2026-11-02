import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ScrimHistoryEntry, ScrimListing, ScrimListingDetail, ScrimSlot } from '@/types/competitive';

let detailData: ScrimListingDetail | undefined;
let historyItems: ScrimHistoryEntry[] = [];

vi.mock('@/hooks/competitive/useScrims', () => ({
  useScrimListingDetail: () => ({ data: detailData }),
  useScrimHistory: () => ({ data: historyItems.length ? { items: historyItems } : undefined }),
  useMakeOffer: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useGameCatalogContext', () => ({
  useGameCatalogContext: () => ({ games: [{ slug: 'valorant', name: 'Valorant', logo: null, icon: null }] }),
}));
vi.mock('../ScrimOfferForm', () => ({
  ScrimOfferForm: (p: { slotId?: string; prefilledProposedAt?: string }) => (
    <div data-testid="offer-form" data-slot={p.slotId ?? ''} data-at={p.prefilledProposedAt ?? ''} />
  ),
}));

import { ScrimDetailModal } from '../ScrimDetailModal';
import { RecentResults } from '../scouting/RecentResults';
import { SlotPicker } from '../scouting/SlotPicker';
import { ScoutingRoster } from '../scouting/ScoutingRoster';

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

const listing = (over: Partial<ScrimListing> = {}): ScrimListing => ({
  id: 'l1', teamId: 'tn', gameSlug: 'valorant', regionKey: 'eu', status: 'open', createdAt: '2026-11-02T10:00:00Z',
  teamName: 'Nova Esports', teamTag: 'NVA', bestOf: 3, scheduleType: 'recurring', preferredDays: [1, 3],
  minRankDisplayName: 'Gold 1', maxRankDisplayName: 'Plat 2', notes: 'Serious Bo3s only', scrimsCompleted: 16,
  record: { wins: 12, losses: 4, draws: 0, completed: 16, noShows: 1, showRate: 0.94, lastPlayedAt: null, last5: ['W'], streak: 0 },
  ...over,
} as ScrimListing);

const slot = (id: string, startsAt: string, status = 'available'): ScrimSlot => ({ id, listingId: 'l1', startsAt, endsAt: startsAt, status } as ScrimSlot);
const slotA = new Date(2026, 10, 3, 19, 0).toISOString();
const slotB = new Date(2026, 10, 3, 20, 0).toISOString();

const entry = (over: Partial<ScrimHistoryEntry> = {}): ScrimHistoryEntry => ({
  sessionId: 'h1', opponentTeamId: 'x', opponentTeamName: 'Old Rivals', opponentTeamLogo: null, scheduledAt: null,
  gameSlug: 'valorant', myScore: 2, opponentScore: 0, result: 'win', mapName: 'Ascent', ...over,
});

beforeEach(() => {
  detailData = { listing: listing(), members: [], slots: [slot('s1', slotA), slot('s2', slotB, 'booked')] };
  historyItems = [];
});

describe('RecentResults', () => {
  it('shows each result with its opponent and score, and nothing when there are none', () => {
    const { rerender, container } = wrap(<RecentResults entries={[entry(), entry({ sessionId: 'h2', result: 'loss', myScore: 1, opponentScore: 2, opponentTeamName: null })]} />);
    expect(screen.getByLabelText('Win')).toBeInTheDocument();
    expect(screen.getByLabelText('Loss')).toBeInTheDocument();
    expect(screen.getByText('vs Old Rivals')).toBeInTheDocument();
    expect(screen.getByText('vs Unknown team')).toBeInTheDocument();
    expect(screen.getByText('1 – 2')).toBeInTheDocument();
    rerender(<MemoryRouter><RecentResults entries={[]} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('SlotPicker', () => {
  it('counts open times, disables booked ones and toggles a selection', () => {
    const onSelect = vi.fn();
    const slots = [slot('s1', slotA), slot('s2', slotB, 'booked')];
    const { rerender } = wrap(<SlotPicker slots={slots} selectedId={null} onSelect={onSelect} />);
    expect(screen.getByText('1 of 2 open')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons[1]).toBeDisabled();
    fireEvent.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith('s1');
    rerender(<MemoryRouter><SlotPicker slots={slots} selectedId="s1" onSelect={onSelect} /></MemoryRouter>);
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
  it('renders nothing without slots', () => {
    const { container } = wrap(<SlotPicker slots={[]} selectedId={null} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ScoutingRoster', () => {
  it('shows ranks and stats, with a dash for missing numbers', () => {
    wrap(<ScoutingRoster members={[
      { username: 'Nova', role: 'captain', rankDisplayName: 'Immortal 1', winRate: 61.2, kdRatio: 1.31, hsPct: null } as never,
      { username: 'Kite', role: 'player' } as never,
    ]} />);
    expect(screen.getByText('Captain')).toBeInTheDocument();
    expect(screen.getByText('Immortal 1')).toBeInTheDocument();
    expect(screen.getByText('61%')).toBeInTheDocument();
    expect(screen.getByText('1.31')).toBeInTheDocument();
    expect(screen.getByText('Unranked')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });
  it('says so when nobody is listed', () => {
    wrap(<ScoutingRoster members={[]} />);
    expect(screen.getByText('No roster listed.')).toBeInTheDocument();
  });
});

describe('ScrimDetailModal', () => {
  const open = (props: Partial<React.ComponentProps<typeof ScrimDetailModal>> = {}) =>
    wrap(<ScrimDetailModal listingId="l1" onClose={vi.fn()} {...props} />);

  it('opens as a scouting report: record, what they want, results and open times', () => {
    historyItems = [entry()];
    open();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('12-4')).toBeInTheDocument();
    expect(screen.getByText('Serious Bo3s only')).toBeInTheDocument();
    expect(screen.getByText('vs Old Rivals')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 open')).toBeInTheDocument();
  });

  it('carries the chosen time into the request', () => {
    open();
    fireEvent.click(screen.getAllByRole('button').find((b) => b.getAttribute('aria-pressed') === 'false')!);
    fireEvent.click(screen.getByRole('button', { name: 'Request scrim' }));
    const form = screen.getByTestId('offer-form');
    expect(form.dataset.slot).toBe('s1');
    expect(form.dataset.at).toBe(slotA);
    expect(screen.getByText(/first to 2/i)).toBeInTheDocument();
  });

  it('lets you request without picking a time, and go back to the report', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Request scrim' }));
    expect(screen.getByTestId('offer-form').dataset.slot).toBe('');
    fireEvent.click(screen.getByRole('button', { name: /back to scouting report/i }));
    expect(screen.getByText('Message from the team')).toBeInTheDocument();
  });

  it('gives the owner the report but no way to request their own listing', () => {
    open({ isOwner: true });
    expect(screen.queryByRole('button', { name: 'Request scrim' })).not.toBeInTheDocument();
    expect(screen.getByText(/manage availability and offers from the workspace/i)).toBeInTheDocument();
  });

  it('omits recent results when history is private or unavailable', () => {
    historyItems = [];
    open();
    expect(screen.queryByText('Recent results')).not.toBeInTheDocument();
    expect(screen.getByText('Message from the team')).toBeInTheDocument();
  });

  it('shows a loading state, then an error if the listing never loads', () => {
    detailData = undefined;
    const { rerender } = open();
    expect(screen.getByLabelText('Loading team')).toBeInTheDocument();
    detailData = { listing: undefined as never, members: [], slots: [] };
    rerender(<MemoryRouter><ScrimDetailModal listingId="l1" onClose={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('Could not load listing details.')).toBeInTheDocument();
  });

  it('closes from the footer', () => {
    const onClose = vi.fn();
    open({ onClose });
    // The dialog also has a corner X named Close; the footer button is the last one.
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(onClose).toHaveBeenCalled();
  });
});
