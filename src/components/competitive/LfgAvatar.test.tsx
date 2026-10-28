import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LfgAvatar } from './LfgAvatar';
import type { LfgListing } from '@/types/competitive';

describe('team logo', () => {
  it('uses an unframed logo and a readable fallback when the image fails', () => {
    const listing = { intent: 'looking_for_player', teamLogoUrl: '/team.png' } as LfgListing;
    const { container, getByText } = render(<LfgAvatar listing={listing} name="Example" />);
    const logo = container.querySelector('img')!;
    expect(logo.parentElement).toHaveClass('team', 'has-logo');
    fireEvent.error(logo);
    expect(getByText('EX')).toHaveClass('team');
    expect(getByText('EX')).not.toHaveClass('has-logo');
  });
});
