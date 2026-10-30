import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InboxPage from './InboxPage';

const state = vi.hoisted(() => ({ readAt: '2026-10-30T10:01:00Z' as string | null, type: 'direct', mark: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/useMessaging', () => ({
  messagingKeys: { messages: (id: string) => ['messages', id] },
  useConversations: () => ({ data: [{ id: 'conv', type: state.type, participants: [{ userId: 'me' }, { userId: 'other', lastReadAt: state.readAt, user: { username: 'Player' } }] }] }),
  useConversationMessages: () => ({ isSuccess: true, data: { pages: [[
    { id: 'one', senderId: 'me', messageType: 'text', content: 'First', createdAt: '2026-10-30T10:00:00Z' },
    { id: 'two', senderId: 'me', messageType: 'text', content: 'Later', createdAt: '2026-10-30T10:02:00Z' },
  ]] }, refetch: vi.fn() }),
  useSendMessage: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useMarkRead: () => ({ isPending: false, mutate: state.mark }),
  useConversationRealtime: vi.fn(),
}));

function showInbox() {
  const client = new QueryClient();
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/inbox/conv']}><Routes><Route path="/inbox/:id" element={<InboxPage />} /></Routes></MemoryRouter></QueryClientProvider>);
}

describe('inbox read receipts', () => {
  beforeEach(() => { state.readAt = '2026-10-30T10:01:00Z'; state.type = 'direct'; state.mark.mockClear(); });
  it('marks the latest loaded message and shows Seen on the last message the other person read', () => {
    showInbox();
    expect(state.mark).toHaveBeenCalledWith('two');
    expect(screen.getByText('First').closest('.inbox-message')).toHaveTextContent('Seen');
    expect(screen.getByText('Later').closest('.inbox-message')).not.toHaveTextContent('Seen');
  });
  it('does not show Seen without a receipt', () => {
    state.readAt = null;
    showInbox();
    expect(screen.queryByText('Seen')).not.toBeInTheDocument();
  });
  it('identifies who has read a group message', () => {
    state.type = 'group';
    showInbox();
    expect(screen.getByText('Seen by Player')).toBeInTheDocument();
  });
});
