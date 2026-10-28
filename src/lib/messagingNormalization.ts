import { toCamelCaseDeep } from '@/lib/caseTransform';
import type { Conversation, ConversationMessage, LfgConversationReference } from '@/types/messaging';

function jsonObject(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return null; }
}

export function normalizeMessage(value: unknown): ConversationMessage {
  const message = toCamelCaseDeep(value) as ConversationMessage;
  const attachments = toCamelCaseDeep(jsonObject((message as ConversationMessage & { attachments?: unknown }).attachments)) as { lfgListing?: Partial<LfgConversationReference> } | null;
  const reference = attachments?.lfgListing;
  const validReference = message.messageType === 'system' && reference &&
    typeof reference.listingId === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(reference.listingId) &&
    typeof reference.gameSlug === 'string' && typeof reference.intent === 'string' && typeof reference.name === 'string';
  return {
    ...message,
    sender: toCamelCaseDeep(jsonObject(message.sender)) as ConversationMessage['sender'],
    listingReference: validReference ? {
      listingId: reference.listingId!, gameSlug: reference.gameSlug!, intent: reference.intent!, name: reference.name!,
      description: typeof reference.description === 'string' ? reference.description : null,
      imageUrl: typeof reference.imageUrl === 'string' ? reference.imageUrl : null,
      bannerUrl: typeof reference.bannerUrl === 'string' ? reference.bannerUrl : null,
    } : null,
  };
}

export function normalizeConversation(value: unknown): Conversation {
  const conversation = toCamelCaseDeep(value) as Conversation;
  return {
    ...conversation,
    unreadCount: Number(conversation.unreadCount ?? 0),
    participants: (conversation.participants ?? []).map(participant => ({
      ...participant, user: toCamelCaseDeep(jsonObject(participant.user)) as typeof participant.user,
    })),
    lastMessage: conversation.lastMessage ? normalizeMessage(conversation.lastMessage) : null,
  };
}
