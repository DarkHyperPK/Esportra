import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NotificationVisual } from './NotificationVisual';
import type { Notification } from '@/contexts/notification-context';

const notification: Notification = { id: 'one', user_id: 'owner', type: 'lfg_interest_received', title: 'Request', message: '', is_read: false, created_at: '', actor_name: 'Player', actor_avatar_url: 'https://example.test/avatar.png' };

describe('notification profile picture', () => {
  it('shows the requester avatar and falls back to initials when it fails', () => {
    const { container } = render(<NotificationVisual notification={notification} />);
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', 'https://example.test/avatar.png');
    fireEvent.error(image!);
    expect(screen.getByText('PL')).toBeInTheDocument();
  });
});
