import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LfgRoster } from './LfgRoster';
import type { LfgListing } from '@/types/competitive';

const query = vi.hoisted(() => ({ value: { isLoading: false, isError: false, data: { status: 'missing', members: [] as object[] }, refetch: vi.fn() } }));
vi.mock('@/hooks/competitive/useLfg', () => ({ useLfgRoster: () => query.value }));
const listing = { id:'listing', teamId:'team', gameSlug:'valorant', intent:'looking_for_player' } as LfgListing;

describe('game roster', () => {
  it('distinguishes missing and ambiguous game rosters', () => {
    const { rerender } = render(<LfgRoster listing={listing} />);
    expect(screen.getByText('No roster for this game.')).toBeInTheDocument();
    query.value.data = { status:'ambiguous', members:[] };
    rerender(<LfgRoster listing={listing} />);
    expect(screen.getByText(/resolve duplicate game rosters/)).toBeInTheDocument();
  });

  it('shows not-synced message when linked member has no stats', () => {
    query.value.data = { status:'available', members:[{ userId:'member', username:'Rook', rosterRole:'starter', isStarter:true, hasRiotAccount:true, kdRatio:null, winRate:null }] };
    render(<LfgRoster listing={listing} />);
    expect(screen.getByText('Rook')).toBeInTheDocument();
    expect(screen.getByText(/Stats not synced/)).toBeInTheDocument();
  });

  it('shows account-not-linked message when member has no Riot account', () => {
    query.value.data = { status:'available', members:[{ userId:'unlinked', username:'Nova', rosterRole:'starter', isStarter:true, hasRiotAccount:false, kdRatio:null, winRate:null }] };
    render(<LfgRoster listing={listing} />);
    expect(screen.getByText('Nova')).toBeInTheDocument();
    expect(screen.getByText(/Account not linked/)).toBeInTheDocument();
  });
});
