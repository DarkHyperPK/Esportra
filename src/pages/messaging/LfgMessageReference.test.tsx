import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LfgMessageReference } from './LfgMessageReference';
import type { LfgConversationReference } from '@/types/messaging';

const reference: LfgConversationReference = { listingId:'c86953ca-4c94-c0f7-fd91-c19e03ff2b9f', gameSlug:'valorant', intent:'looking_for_team', name:'Player', description:'Looking for a coordinated team', imageUrl:null, bannerUrl:'/card.jpg' };

describe('LFG conversation reference', () => {
  it('links back to the exact listing with its game and feed context', () => {
    render(<MemoryRouter><LfgMessageReference reference={reference} /></MemoryRouter>);
    const link = screen.getByRole('link');
    const params = new URL(link.getAttribute('href')!, 'https://esportra.com').searchParams;
    expect(params.get('listing')).toBe(reference.listingId);
    expect(params.get('kind')).toBe('players');
    expect(params.get('game')).toBe('valorant');
    expect(screen.getByText(reference.description!)).toBeVisible();
  });

  it('preserves readable team context if its artwork fails', () => {
    const { container } = render(<MemoryRouter><LfgMessageReference reference={{ ...reference, intent:'looking_for_player', name:'Team North' }} /></MemoryRouter>);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('link')).toHaveTextContent('Team North');
    expect(screen.getByRole('link')).toHaveAttribute('href', expect.stringContaining('kind=teams'));
  });
});
