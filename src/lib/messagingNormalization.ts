import { toCamelCaseDeep } from '@/lib/caseTransform';
import type { Conversation, ConversationMessage } from '@/types/messaging';

function jsonObject(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return null; }
}

export function normalizeMessage(value: unknown): ConversationMessage {
  const message = toCamelCaseDeep(value) as ConversationMessage;
  return { ...message, sender: toCamelCaseDeep(jsonObject(message.sender)) as ConversationMessage['sender'] };
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
