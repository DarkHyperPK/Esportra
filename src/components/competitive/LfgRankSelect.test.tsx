import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LfgRankSelect } from './LfgRankSelect';
import type { CatalogRankTier } from '@/types/competitive';

const catalog = vi.hoisted(() => ({ tiers: { 3: { smallIcon: '/current-iron.png' }, 4: { smallIcon: '/current-iron-2.png' } } }));
vi.mock('@/hooks/useValorantCatalog', () => ({ useValorantTiers: () => ({ data: catalog.tiers }) }));

const ranks = [
  { id: 'iron', sortOrder: 0, displayName: 'Iron 1', iconUrl: '/old-iron.png' },
  { id: 'iron2', sortOrder: 1, displayName: 'Iron 2', iconUrl: '/old-iron-2.png' },
] as CatalogRankTier[];

describe('rank filter badges', () => {
  it('prefers current Valorant assets and changes the selected badge', () => {
    const props = { label: 'Minimum rank', game: 'valorant', ranks, value: '0', onChange: vi.fn() };
    const { rerender } = render(<LfgRankSelect {...props} />);
    expect(within(screen.getByRole('button', { name: 'Minimum rank' })).getByRole('presentation')).toHaveAttribute('src', '/current-iron.png');
    rerender(<LfgRankSelect {...props} value="1" />);
    expect(within(screen.getByRole('button', { name: 'Minimum rank' })).getByRole('presentation')).toHaveAttribute('src', '/current-iron-2.png');
  });
  it('falls back when the current asset fails', () => {
    render(<LfgRankSelect label="Minimum rank" game="valorant" ranks={ranks} value="0" onChange={() => {}} />);
    const image = within(screen.getByRole('button', { name: 'Minimum rank' })).getByRole('presentation');
    fireEvent.error(image);
    expect(image).toHaveAttribute('src', 'https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiers/3.png');
  });
  it('keeps catalog assets for other games', () => {
    render(<LfgRankSelect label="Minimum rank" game="cs2" ranks={ranks} value="0" onChange={() => {}} />);
    expect(within(screen.getByRole('button', { name: 'Minimum rank' })).getByRole('presentation')).toHaveAttribute('src', '/old-iron.png');
  });
});
