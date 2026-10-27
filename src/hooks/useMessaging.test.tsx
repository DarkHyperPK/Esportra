import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useConversationRealtime } from './useMessaging';
import type { ConversationMessage } from '@/types/messaging';

const hub = vi.hoisted(() => ({ invoke: vi.fn().mockResolvedValue(undefined), on: vi.fn(), off: vi.fn() }));
vi.mock('@/hooks/useSignalR', () => ({ useHub: () => hub }));
vi.mock('@/lib/signalrClient', () => ({ HubPaths: { Conversation: '/hubs/conversation' } }));
vi.mock('@/lib/apiClient', () => ({ apiClient: {} }));

describe('conversation realtime delivery', () => {
  it('ignores messages for other conversations and unsubscribes on exit', () => {
    const received = vi.fn();
    const { unmount } = renderHook(() => useConversationRealtime('conversation-a', received));
    const handler = hub.on.mock.calls.find(call => call[0] === 'MessageReceived')?.[1] as (message: ConversationMessage) => void;
    act(() => {
      handler({ id:'other', conversationId:'conversation-b' } as ConversationMessage);
      handler({ id:'correct', conversationId:'conversation-a' } as ConversationMessage);
    });
    expect(received).toHaveBeenCalledTimes(1);
    expect(received).toHaveBeenCalledWith(expect.objectContaining({ id:'correct' }));
    unmount();
    expect(hub.off).toHaveBeenCalledWith('MessageReceived', handler);
    expect(hub.invoke).toHaveBeenCalledWith('LeaveConversation', 'conversation-a');
  });
});
