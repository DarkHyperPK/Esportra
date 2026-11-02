import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const sendMutate = vi.fn();
const markRead = vi.fn();

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/competitive/useScrimConversation', () => ({ useScrimConversation: () => ({ data: 'conv-1' }) }));
vi.mock('@/hooks/useMessaging', () => ({
  messagingKeys: { messages: (id: string) => ['m', id] },
  useConversationMessages: () => ({
    isLoading: false, isError: false,
    data: { pages: [[
      { id: 'm1', conversationId: 'conv-1', senderId: 'me', content: 'Chat for A vs B.', messageType: 'system', createdAt: '2026-11-04T17:00:00Z', sender: null },
      { id: 'm2', conversationId: 'conv-1', senderId: 'them', content: 'Tuesday 8pm?', messageType: 'text', createdAt: '2026-11-04T18:00:00Z', sender: { username: 'NovaCap' } },
    ]] },
  }),
  useSendMessage: () => ({ mutateAsync: sendMutate, isPending: false, isError: false }),
  useMarkRead: () => ({ mutate: markRead }),
  useConversations: () => ({ data: [{ id: 'conv-1', unreadCount: 2 }] }),
  useConversationRealtime: () => undefined,
}));
vi.mock('@tanstack/react-query', async (orig) => ({ ...(await orig<typeof import('@tanstack/react-query')>()), useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));

import { ScrimRoomChat } from '../ScrimRoomChat';

const chat = (openOnArrival: boolean) =>
  render(<MemoryRouter><ScrimRoomChat sessionId="s1" opponentName="Nova" openOnArrival={openOnArrival} /></MemoryRouter>);

beforeEach(() => { sendMutate.mockReset().mockResolvedValue({}); markRead.mockReset(); localStorage.clear(); });

describe('ScrimRoomChat', () => {
  it('opens on arrival while a time is still to agree, and shows the conversation', () => {
    chat(true);
    expect(screen.getByRole('region', { name: 'Chat with Nova' })).toBeInTheDocument();
    expect(screen.getByText('Tuesday 8pm?')).toBeInTheDocument();
    expect(screen.getByText('NovaCap')).toBeInTheDocument();
    expect(screen.getByText('Chat for A vs B.')).toBeInTheDocument();
  });

  it('stays a button with the unread count when not opened on arrival', () => {
    chat(false);
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByRole('button', { name: /Open chat, 2 unread/ })).toBeInTheDocument();
  });

  it('does not reopen by itself after it was closed', () => {
    const first = chat(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }));
    first.unmount();
    chat(true);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('sends a message with Enter and clears the box', async () => {
    chat(true);
    const box = screen.getByLabelText('Message');
    fireEvent.change(box, { target: { value: 'Works for us' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(sendMutate).toHaveBeenCalledWith({ content: 'Works for us' }));
    await waitFor(() => expect(box).toHaveValue(''));
  });

  it('marks the conversation read once it is open', () => {
    chat(true);
    expect(markRead).toHaveBeenCalledWith('m2');
  });
});
