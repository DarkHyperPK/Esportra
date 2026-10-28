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

  it('restores the listing snapshot from JSONB and realtime messages', () => {
    const listing = { listing_id:'c86953ca-4c94-c0f7-fd91-c19e03ff2b9f', game_slug:'valorant', intent:'looking_for_team', name:'Coach', description:'Ready to coach', banner_url:'/card.jpg' };
    for (const attachments of [JSON.stringify({ lfg_listing:listing }), { lfg_listing:listing }]) {
      const message = normalizeMessage({ message_type:'system', attachments });
      expect(message.listingReference).toEqual(expect.objectContaining({ listingId:listing.listing_id, gameSlug:'valorant', name:'Coach', bannerUrl:'/card.jpg' }));
      expect(normalizeMessage(message).listingReference).toEqual(message.listingReference);
    }
  });

  it('ignores forged text-message references and malformed snapshots', () => {
    expect(normalizeMessage({ message_type:'text', attachments:{ lfg_listing:{ name:'Fake' } } }).listingReference).toBeNull();
    expect(normalizeMessage({ message_type:'system', attachments:'invalid' }).listingReference).toBeNull();
    expect(normalizeMessage({ message_type:'system', attachments:{ lfg_listing:{ listing_id:'../../bad', name:'Player', game_slug:'valorant', intent:'looking_for_team' } } }).listingReference).toBeNull();
  });
});
