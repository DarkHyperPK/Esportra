import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LfgAgentPicker } from './LfgAgentPicker';
import { LfgListingCard } from './LfgListingCard';
import type { LfgListing } from '@/types/competitive';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LfgRankRange } from './LfgRankRange';

const agents = vi.hoisted(() => Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`agent-${i}`, { uuid:`agent-${i}`, displayName:`Agent ${i}`, displayIcon:`/agent-${i}.png` }])));
vi.mock('@/hooks/useValorantCatalog', () => ({ useValorantAgents: () => ({ data: agents }) }));

describe('compact LFG cards', () => {
  it('limits selection to five while allowing a selection to be removed', () => {
    function Picker() { const [value, setValue] = useState<string[]>([]); return <LfgAgentPicker value={value} onChange={setValue} />; }
    render(<Picker />);
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: new RegExp(`Agent ${i}`) }));
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agent 5/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Agent 0/ }));
    expect(screen.getByRole('button', { name: /Agent 5/ })).toBeEnabled();
  });

  it('shows selected-agent performance and keeps unplayed stats unavailable', () => {
    const listing = { id:'one', userId:'other', intent:'looking_for_team', gameSlug:'valorant', username:'Kairo', avatarSeed:null, teamId:null,
      preferredAgents:['agent-0','agent-1'], preferredRoles:[], languages:[], statsSyncStatus:'complete', popularAgents:[{ agentId:'agent-0', displayName:'Agent 0', iconUrl:'', gamesPlayed:10, wins:6, kdRatio:1.2 }], description:'Ready to play', minRankDisplayName:'Diamond' } as unknown as LfgListing;
    render(<LfgListingCard listing={listing} roles={[]} selected={false} onSelect={() => {}} onSave={() => {}} savePending={false} isOwn={false} />);
    expect(screen.getByRole('img', { name:'Agent 0: 60% win rate, 1.20 K/D' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name:'Agent 1: No recorded matches' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name:'More details' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows current-act agent stats without an act selector', () => {
    const current = [{ agentId:'agent-0', displayName:'Agent 0', iconUrl:'', gamesPlayed:10, wins:6, kdRatio:1.2 }];
    render(<LfgAgentPicker value={[]} onChange={() => {}} stats={current} syncStatus="complete" />);
    expect(screen.getByText(/10 games.*60% WR.*1.20 K\/D/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Agent stats period')).not.toBeInTheDocument();
  });

  it('distinguishes unavailable agent stats from a completed sync with no matches', () => {
    const { rerender } = render(<LfgAgentPicker value={[]} onChange={() => {}} syncStatus="error" />);
    expect(screen.getAllByText('Stats unavailable').length).toBeGreaterThan(0);
    rerender(<LfgAgentPicker value={[]} onChange={() => {}} syncStatus="complete" />);
    expect(screen.getAllByText('No recorded matches').length).toBeGreaterThan(0);
  });

  it('does not treat a legacy LFT requirement as the player current rank', () => {
    const listing = { id:'rank', userId:'other', intent:'looking_for_team', gameSlug:'valorant', username:'Player',
      preferredAgents:[], preferredRoles:[], languages:[], minRankDisplayName:'Diamond', competitiveTierName:null } as unknown as LfgListing;
    const props = { listing, roles:[], selected:false, onSelect:() => {}, onSave:() => {}, savePending:false, isOwn:false };
    const { rerender } = render(<LfgListingCard {...props} />);
    expect(screen.getByLabelText('Current rank: Unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Diamond')).not.toBeInTheDocument();
    rerender(<LfgListingCard {...props} listing={{ ...listing, competitiveTierName:'Gold 1' }} />);
    expect(screen.getByText('Gold 1')).toBeInTheDocument();
  });

  it('shows both boundaries of a recruiting rank range', () => {
    const listing = { gameSlug:'valorant', minRankSortOrder:4, maxRankSortOrder:9, minRankDisplayName:'Diamond', maxRankDisplayName:'Ascendant' } as LfgListing;
    render(<LfgRankRange listing={listing} />);
    expect(screen.getByText('Diamond')).toBeInTheDocument();
    expect(screen.getByText('Ascendant')).toBeInTheDocument();
  });

  it('uses the synced Riot player card and falls back cleanly if it fails', () => {
    const listing = { id:'one', userId:'other', intent:'looking_for_team', gameSlug:'valorant', username:'Kairo', avatarSeed:null,
      playerCardId:'c86953ca-4c94-c0f7-fd91-c19e03ff2b9f', profileBannerUrl:'https://example.com/banner.png', preferredAgents:[], preferredRoles:[], languages:[] } as unknown as LfgListing;
    const { container, rerender } = render(<QueryClientProvider client={new QueryClient()}><LfgListingCard listing={listing} roles={[]} selected={false} onSelect={() => {}} onSave={() => {}} savePending={false} isOwn={false} /></QueryClientProvider>);
    const banner = container.querySelector('.lfg-compact-banner');
    expect(banner).toHaveAttribute('src', 'https://media.valorant-api.com/playercards/c86953ca-4c94-c0f7-fd91-c19e03ff2b9f/wideart.png');
    fireEvent.error(banner!);
    expect(container.querySelector('.lfg-compact-banner')).toHaveAttribute('src', listing.profileBannerUrl);
    rerender(<QueryClientProvider client={new QueryClient()}><LfgListingCard listing={{ ...listing, playerCardId: null }} roles={[]} selected={false} onSelect={() => {}} onSave={() => {}} savePending={false} isOwn={false} /></QueryClientProvider>);
    expect(container.querySelector('.lfg-compact-banner')).toHaveAttribute('src', listing.profileBannerUrl);
    fireEvent.error(container.querySelector('.lfg-compact-banner')!);
    expect(container.querySelector('.lfg-compact-banner')).not.toBeInTheDocument();
    expect(container.querySelector('.lfg-compact-hero')).toHaveClass('no-art');
  });

  it('preserves profile banners for other games', () => {
    const listing = { id:'one', userId:'other', intent:'looking_for_team', gameSlug:'cs2', username:'Kairo',
      profileBannerUrl:'https://example.com/banner.png', preferredAgents:[], preferredRoles:[], languages:[] } as unknown as LfgListing;
    const { container } = render(<LfgListingCard listing={listing} roles={[]} selected={false} onSelect={() => {}} onSave={() => {}} savePending={false} isOwn={false} />);
    expect(container.querySelector('.lfg-compact-banner')).toHaveAttribute('src', listing.profileBannerUrl);
  });

  it('does not put the captain profile banner on a team listing', () => {
    const listing = { id:'team', userId:'other', intent:'looking_for_player', gameSlug:'valorant', teamName:'Team',
      profileBannerUrl:'https://example.com/banner.png', preferredRoles:[], languages:[] } as unknown as LfgListing;
    const { container } = render(<QueryClientProvider client={new QueryClient()}><LfgListingCard listing={listing} roles={[]} selected={false} onSelect={() => {}} onSave={() => {}} savePending={false} isOwn={false} /></QueryClientProvider>);
    expect(container.querySelector('.lfg-compact-banner')).not.toBeInTheDocument();
  });
  it('gives coach cards an icon and WR/KD/HS without a match count', () => {
    const listing = { id:'coach', intent:'looking_for_team', gameSlug:'valorant', username:'Coach', preferredRoles:['coach'], preferredAgents:['agent-0'], languages:[], winRate:50, kdRatio:1.5, hsPct:0, matchesAnalyzed:53 } as unknown as LfgListing;
    const { container } = render(<LfgListingCard listing={listing} roles={[]} selected={false} onSelect={() => {}} onSave={() => {}} savePending={false} isOwn={false} />);
    expect(container.querySelector('.lfg-role svg')).toBeInTheDocument();
    expect(screen.getByText('HS%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.queryByText('Matches')).not.toBeInTheDocument();
    expect(container.querySelector('.lfg-compact-agent')).toBeInTheDocument();
  });

});
