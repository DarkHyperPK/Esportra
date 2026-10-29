import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { InboxSidebarLink } from './InboxSidebarLink';

const state = vi.hoisted(() => ({ counts: [2, 3], realtime: vi.fn() }));
vi.mock('@/hooks/useMessaging', () => ({
  useConversations: () => ({ data: state.counts.map(unreadCount => ({ unreadCount })) }),
  useConversationRealtime: state.realtime,
}));

describe('Inbox navigation unread messages', () => {
  it('sums unread messages across conversations and updates after reads', () => {
    state.counts = [2, 3];
    const { rerender } = render(<MemoryRouter><InboxSidebarLink active={false} collapsed={false} /></MemoryRouter>);
    expect(screen.getByRole('link', { name:'Inbox, 5 unread messages' })).toHaveTextContent('5');
    state.counts = [0, 3];
    rerender(<MemoryRouter><InboxSidebarLink active={false} collapsed={false} /></MemoryRouter>);
    expect(screen.getByRole('link', { name:'Inbox, 3 unread messages' })).toHaveTextContent('3');
    expect(state.realtime).toHaveBeenCalled();
  });

  it('keeps the full accessible count in collapsed mode while capping the visual badge', () => {
    state.counts = [50, 80];
    render(<MemoryRouter><InboxSidebarLink active collapsed /></MemoryRouter>);
    expect(screen.getByRole('link', { name:'Inbox, 130 unread messages' })).toHaveTextContent('99+');
    expect(screen.getByRole('link')).toHaveAttribute('aria-current', 'page');
  });

  it('hides the badge when no unread messages remain', () => {
    state.counts = [0, -1, Number.NaN];
    const { container } = render(<MemoryRouter><InboxSidebarLink active={false} collapsed /></MemoryRouter>);
    expect(screen.getByRole('link', { name:'Inbox' })).toBeInTheDocument();
    expect(container.querySelector('.product-sidebar-unread')).toBeNull();
  });
});
