export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  lastReadAt: string | null;
  isActive: boolean;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'system';
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  participants: ConversationParticipant[];
  lastMessage: ConversationMessage | null;
}

export interface SendMessageRequest {
  content: string;
  messageType?: 'text';
}
