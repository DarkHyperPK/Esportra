import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LfgAgentPicker } from './LfgAgentPicker';
import { LfgListingCard } from './LfgListingCard';
import type { LfgListing } from '@/types/competitive';

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
      preferredAgents:['agent-0','agent-1'], preferredRoles:[], languages:[], popularAgents:[{ agentId:'agent-0', displayName:'Agent 0', iconUrl:'', gamesPlayed:10, wins:6, kdRatio:1.2 }], description:'Ready to play', minRankDisplayName:'Diamond' } as unknown as LfgListing;
    render(<LfgListingCard listing={listing} roles={[]} selected={false} onSelect={() => {}} onSave={() => {}} savePending={false} isOwn={false} />);
    expect(screen.getByRole('img', { name:'Agent 0: 60% win rate, 1.20 K/D' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name:'Agent 1: No recorded matches' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name:'More details' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('uses the player profile banner and falls back cleanly if it fails', () => {
    const listing = { id:'one', userId:'other', intent:'looking_for_team', gameSlug:'valorant', username:'Kairo', avatarSeed:null,
      profileBannerUrl:'https://example.com/banner.png', preferredAgents:[], preferredRoles:[], languages:[] } as unknown as LfgListing;
    const { container } = render(<LfgListingCard listing={listing} roles={[]} selected={false} onSelect={() => {}} onSave={() => {}} savePending={false} isOwn={false} />);
    const banner = container.querySelector('.lfg-compact-banner');
    expect(banner).toHaveAttribute('src', listing.profileBannerUrl);
    fireEvent.error(banner!);
    expect(container.querySelector('.lfg-compact-banner')).not.toBeInTheDocument();
    expect(container.querySelector('.lfg-compact-hero')).toHaveClass('no-art');
  });

  it('does not put the captain profile banner on a team listing', () => {
    const listing = { id:'team', userId:'other', intent:'looking_for_player', gameSlug:'valorant', teamName:'Team',
      profileBannerUrl:'https://example.com/banner.png', preferredRoles:[], languages:[] } as unknown as LfgListing;
    const { container } = render(<LfgListingCard listing={listing} roles={[]} selected={false} onSelect={() => {}} onSave={() => {}} savePending={false} isOwn={false} />);
    expect(container.querySelector('.lfg-compact-banner')).not.toBeInTheDocument();
  });
});
