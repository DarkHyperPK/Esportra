import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useGameCatalogContext', () => ({
  useGameCatalogContext: () => ({ games: [{ slug: 'valorant', name: 'Valorant', logo: null, icon: null }] }),
}));

import { WeekDots } from '../listing/WeekDots';
import { RankBand } from '../listing/RankBand';
import { RosterFaces } from '../listing/RosterFaces';
import { FitBadge } from '../listing/FitBadge';
import { DiscoveryEmpty } from '../listing/DiscoveryEmpty';
import { DiscoveryToolbar } from '../listing/DiscoveryToolbar';
import { ScrimOpponentCard } from '../listing/ScrimOpponentCard';
import type { ScrimListingEnriched } from '@/services/scrimDiscoveryUtils';

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('WeekDots', () => {
  it('describes the chosen days for screen readers and lights seven squares', () => {
    wrap(<WeekDots days={[1, 3, 5]} />);
    expect(screen.getByRole('img', { name: 'Available Mon, Wed, Fri' })).toBeInTheDocument();
    expect(document.querySelectorAll('[title]')).toHaveLength(7);
  });
  it('says so when no days are set', () => {
    wrap(<WeekDots days={null} />);
    expect(screen.getByRole('img', { name: 'No days set' })).toBeInTheDocument();
  });
});

describe('RankBand', () => {
  it('shows a range, a single rank, or any rank', () => {
    const { rerender } = wrap(<RankBand minName="Gold 1" maxName="Plat 2" />);
    expect(screen.getByLabelText('Gold 1 to Plat 2')).toBeInTheDocument();
    rerender(<MemoryRouter><RankBand minName="Gold 1" maxName="Gold 1" /></MemoryRouter>);
    expect(screen.getByText('Gold 1')).toBeInTheDocument();
    expect(screen.queryByLabelText(/ to /)).not.toBeInTheDocument();
    rerender(<MemoryRouter><RankBand minName={null} maxName={null} /></MemoryRouter>);
    expect(screen.getByText('Any rank')).toBeInTheDocument();
  });
});

describe('RosterFaces', () => {
  const members = ['a', 'b', 'c'].map((u) => ({ username: u, avatarSeed: null, rankTierKey: null }));
  it('names the roster and counts the players not shown', () => {
    wrap(<RosterFaces members={members} total={5} />);
    expect(screen.getByRole('img', { name: 'Roster: a, b, c and 2 more' })).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
  it('renders nothing without members', () => {
    const { container } = wrap(<RosterFaces members={[]} total={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('FitBadge', () => {
  it('shows the label, and nothing when there is no fit to show', () => {
    const { rerender, container } = wrap(<FitBadge fit={{ label: 'Rank gap', tone: 'warning' }} />);
    expect(screen.getByText('Rank gap')).toBeInTheDocument();
    rerender(<MemoryRouter><FitBadge fit={null} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('DiscoveryEmpty', () => {
  it('gives each empty state its own next step', () => {
    const onClear = vi.fn();
    const onRetry = vi.fn();
    const { rerender } = wrap(<DiscoveryEmpty kind="none" gameName="Valorant" />);
    expect(screen.getByText(/nobody is looking for valorant scrims/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Post a listing' })).toHaveAttribute('href', '/competitive/scrims/workspace');

    rerender(<MemoryRouter><DiscoveryEmpty kind="filtered" gameName="Valorant" onClearFilters={onClear} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClear).toHaveBeenCalled();

    rerender(<MemoryRouter><DiscoveryEmpty kind="error" gameName="Valorant" onRetry={onRetry} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('DiscoveryToolbar', () => {
  const base = {
    games: [{ value: 'valorant', label: 'Valorant' }], game: 'valorant', onGameChange: vi.fn(),
    regions: [], region: '', onRegionChange: vi.fn(),
    ranks: [], minRank: '', onMinRankChange: vi.fn(), maxRank: '', onMaxRankChange: vi.fn(),
    sort: 'newest' as const, onSortChange: vi.fn(),
  };
  it('lists applied filters as chips that can be removed', () => {
    const onDismiss = vi.fn();
    wrap(<DiscoveryToolbar {...base} chips={[{ key: 'region', label: 'Europe', onDismiss }]} />);
    const list = screen.getByRole('list', { name: 'Applied filters' });
    expect(within(list).getByText('Europe')).toBeInTheDocument();
    fireEvent.click(within(list).getByRole('button', { name: 'Remove Europe filter' }));
    expect(onDismiss).toHaveBeenCalled();
  });
  it('shows no chip list when nothing is applied', () => {
    wrap(<DiscoveryToolbar {...base} chips={[]} />);
    expect(screen.queryByRole('list', { name: 'Applied filters' })).not.toBeInTheDocument();
  });
});

describe('ScrimOpponentCard', () => {
  const listing = (over: Partial<ScrimListingEnriched> = {}): ScrimListingEnriched => ({
    id: 'l1', teamId: 'other', gameSlug: 'valorant', regionKey: 'eu', status: 'open', createdAt: new Date().toISOString(),
    teamName: 'Nova Esports', teamTag: 'NVA', bestOf: 3, scheduleType: 'recurring', preferredDays: [1, 3],
    minRankDisplayName: 'Gold 1', maxRankDisplayName: 'Plat 2', notes: 'Serious Bo3s only', scrimsCompleted: 16,
    activeMemberCount: 5, membersPreview: [{ username: 'a', avatarSeed: 's', rankTierKey: null }],
    record: { wins: 12, losses: 4, draws: 0, completed: 16, noShows: 1, showRate: 0.94, lastPlayedAt: null, last5: ['W', 'L'], streak: 0 },
    ...over,
  } as ScrimListingEnriched);

  const card = (over: Partial<React.ComponentProps<typeof ScrimOpponentCard>> = {}) =>
    wrap(<ScrimOpponentCard listing={listing()} fit={null} isOwner={false} hasTeam onOpen={vi.fn()} {...over} />);

  it('leads with identity and the record', () => {
    card({ fit: { label: 'Good fit', tone: 'success' } });
    expect(screen.getByRole('heading', { name: 'Nova Esports' })).toBeInTheDocument();
    expect(screen.getByText('12-4')).toBeInTheDocument();
    expect(screen.getByText('Good fit')).toBeInTheDocument();
    expect(screen.getByText(/16 scrims played/)).toBeInTheDocument();
  });

  it('opens the listing from both Details and Request', () => {
    const onOpen = vi.fn();
    card({ onOpen });
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request' }));
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it('sends your own listing to Manage, not Request', () => {
    card({ isOwner: true });
    expect(screen.getByRole('link', { name: 'Manage' })).toHaveAttribute('href', '/competitive/scrims/workspace');
    expect(screen.queryByRole('button', { name: 'Request' })).not.toBeInTheDocument();
  });

  it('asks a player without a team to join one first', () => {
    card({ hasTeam: false });
    expect(screen.getByRole('link', { name: 'Join a team' })).toHaveAttribute('href', '/teams');
  });

  it('cannot be requested once closed', () => {
    card({ listing: listing({ status: 'closed' }) });
    expect(screen.getByText('Closed')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('button', { name: 'Request' })).not.toBeInTheDocument();
  });

  it('shows no record for a team that hides its history, and still works', () => {
    card({ listing: listing({ record: null }) });
    expect(screen.queryByText('12-4')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request' })).toBeInTheDocument();
  });

  it('copes with a team that has no logo, tag, notes or roster', () => {
    card({ listing: listing({ teamTag: null, notes: null, membersPreview: null as never, teamName: null as never }) });
    expect(screen.getByRole('heading', { name: 'Unknown team' })).toBeInTheDocument();
  });
});

// ── Own listing card ─────────────────────────────────────────────────────────

const mutate = vi.fn();
const mutateAsync = vi.fn();
let offersForListing: Array<{ id: string; status: string }> = [];

vi.mock('@/hooks/competitive/useScrims', () => ({
  useListingOffers: () => ({ data: offersForListing }),
  usePauseListing: () => ({ mutate, isPending: false }),
  useReopenListing: () => ({ mutate, isPending: false }),
  useCloseListing: () => ({ mutate, isPending: false }),
  useDeleteScrimListing: () => ({ mutateAsync, isPending: false }),
  useUpdateScrimListing: () => ({ mutateAsync, isPending: false }),
}));

import { OwnListingCard } from '../listing/OwnListingCard';
import type { ScrimListing } from '@/types/competitive';

describe('OwnListingCard', () => {
  const own = (over: Partial<ScrimListing> = {}): ScrimListing => ({
    id: 'mine', teamId: 't', gameSlug: 'valorant', status: 'open', createdAt: '2026-11-02T10:00:00Z',
    bestOf: 3, scheduleType: 'recurring', preferredDays: [1, 3], regionKey: 'eu',
    minRankDisplayName: 'Gold 1', maxRankDisplayName: 'Plat 2', notes: 'Serious only',
    ...over,
  } as ScrimListing);

  const renderCard = (listing = own(), overlap: string[] = []) =>
    wrap(<OwnListingCard listing={listing} overlappingWith={overlap} />);

  it('shows what the listing offers and that it is live', () => {
    mutate.mockReset();
    offersForListing = [];
    renderCard();
    expect(screen.getByRole('heading', { name: 'Valorant' })).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Available Mon, Wed' })).toBeInTheDocument();
    expect(screen.getByText(/Serious only/)).toBeInTheDocument();
  });

  it('surfaces waiting offers and links to where they are answered', () => {
    offersForListing = [{ id: 'a', status: 'pending' }, { id: 'b', status: 'pending' }, { id: 'c', status: 'accepted' }];
    renderCard();
    const banner = screen.getByRole('link', { name: /2 new offers waiting/i });
    expect(banner).toHaveAttribute('href', '#needs-you-title');
    expect(screen.getByRole('button', { name: /1 booked/i })).toBeInTheDocument();
  });

  it('shows no offers banner when nothing is waiting', () => {
    offersForListing = [{ id: 'c', status: 'accepted' }];
    renderCard();
    expect(screen.queryByRole('link', { name: /new offer/i })).not.toBeInTheDocument();
  });

  it('offers Pause while open and Reopen while paused', () => {
    offersForListing = [];
    const { rerender } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(mutate).toHaveBeenCalledTimes(1);
    rerender(<MemoryRouter><OwnListingCard listing={own({ status: 'paused' })} /></MemoryRouter>);
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
  });

  it('offers no editing or reopening once closed', () => {
    offersForListing = [];
    renderCard(own({ status: 'closed' }));
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('asks twice before deleting, and Keep backs out', async () => {
    mutateAsync.mockReset().mockResolvedValue({});
    offersForListing = [];
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('opens the editor from Edit and warns about overlapping listings', () => {
    offersForListing = [];
    renderCard(own(), ['Mon/Wed listing']);
    expect(screen.getByRole('note')).toHaveTextContent(/Overlaps Mon\/Wed listing/);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('Edit listing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close editor' })).toBeInTheDocument();
  });
});
