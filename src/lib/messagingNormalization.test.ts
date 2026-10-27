import { describe, expect, it } from 'vitest';
import { normalizeConversation, normalizeMessage } from './messagingNormalization';

describe('messaging API normalization', () => {
  it('normalizes snake_case rows and JSONB profile strings', () => {
    const conversation = normalizeConversation({ id:'c', unread_count:2, participants:[{ user_id:'u', user:'{"username":"player","avatar_url":"photo"}' }], last_message:{ conversation_id:'c', sender_id:'u', sender:'{"full_name":"Player"}' } });
    expect(conversation.unreadCount).toBe(2);
    expect(conversation.participants[0].userId).toBe('u');
    expect(conversation.participants[0].user.avatarUrl).toBe('photo');
    expect(conversation.lastMessage?.sender?.fullName).toBe('Player');
    expect(conversation.lastMessage?.conversationId).toBe('c');
  });

  it('accepts realtime camelCase payloads and malformed profile data safely', () => {
    expect(normalizeMessage({ conversationId:'c', sender:'invalid' }).sender).toBeNull();
    expect(normalizeMessage({ conversationId:'c', sender:{ username:'player' } }).conversationId).toBe('c');
  });
});
