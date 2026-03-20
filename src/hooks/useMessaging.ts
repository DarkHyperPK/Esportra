import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { buildHubConnection, startWithRetry, HubPaths } from '@/lib/signalrClient';
import { useToast } from '@/hooks/use-toast';
import type { HubConnection } from '@microsoft/signalr';

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'team' | 'tournament';
  title?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at?: string;
  is_active: boolean;
  user?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  attachments: any;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export const useMessaging = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const currentConversationRef = useRef<Conversation | null>(null);

  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiClient.get<Conversation[]>('/api/conversations');
      setConversations(data ?? []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [user]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const data = await apiClient.get<Message[]>(`/api/conversations/${conversationId}/messages`);
      setMessages(data ?? []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  const createConversation = async (participantIds: string[], type: 'direct' | 'group' = 'direct', title?: string) => {
    if (!user) return null;

    try {
      setSending(true);
      const conversation = await apiClient.post<Conversation>('/api/conversations', {
        type,
        title,
        participantIds,
      });

      setCurrentConversation(conversation);
      if (conversation?.id) {
        await fetchMessages(conversation.id);
      }
      await fetchConversations();
      return conversation;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create conversation.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (conversationId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text', attachments: any = {}) => {
    if (!user) return null;

    try {
      setSending(true);
      const data = await apiClient.post<Message>(`/api/conversations/${conversationId}/messages`, {
        content,
        messageType,
        attachments: JSON.stringify(attachments),
      });

      setMessages(prev => [...prev, data]);
      await fetchConversations();
      return data;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (conversationId: string) => {
    if (!user) return;
    try {
      await apiClient.put(`/api/conversations/${conversationId}/read`, {});
      await fetchConversations();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const joinConversation = async (conversationId: string) => {
    if (!user) return false;
    try {
      await apiClient.post(`/api/conversations/${conversationId}/join`, {});
      await fetchConversations();
      return true;
    } catch (error: any) {
      console.error('Error joining conversation:', error);
      return false;
    }
  };

  const leaveConversation = async (conversationId: string) => {
    if (!user) return false;
    try {
      await apiClient.post(`/api/conversations/${conversationId}/leave`, {});
      await fetchConversations();
      setCurrentConversation(null);
      setMessages([]);
      return true;
    } catch (error: any) {
      console.error('Error leaving conversation:', error);
      return false;
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    try {
      const data = await apiClient.put<Message>(`/api/messages/${messageId}`, { content: newContent });
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, ...data } : msg
      ));
      return data;
    } catch (error: any) {
      console.error('Error editing message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to edit message.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await apiClient.delete(`/api/messages/${messageId}`);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      return true;
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete message.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const conversationIds = useMemo(() => {
    return conversations.map(c => c.id);
  }, [conversations]);

  // Ref to track SignalR connection
  const connectionRef = useRef<HubConnection | null>(null);

  // Real-time subscription via SignalR ConversationHub
  useEffect(() => {
    if (!user || conversationIds.length === 0) return;

    const connection = buildHubConnection(HubPaths.Conversation);
    connectionRef.current = connection;

    // Event handlers
    connection.on('MessageReceived', (newMessage: Message) => {
      const current = currentConversationRef.current;
      if (current && newMessage.conversation_id === current.id) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
      }

      setConversations(prev => {
        const currentId = currentConversationRef.current?.id;
        return prev.map(conv => {
          if (conv.id === newMessage.conversation_id) {
            return {
              ...conv,
              last_message: newMessage,
              updated_at: newMessage.created_at,
              unread_count: currentId === conv.id 
                ? (conv.unread_count || 0) 
                : (conv.unread_count || 0) + 1,
            };
          }
          return conv;
        }).sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
    });

    connection.on('MessageEdited', (update: { id: string; content: string; is_edited: boolean; edited_at: string }) => {
      setMessages(prev => prev.map(msg =>
        msg.id === update.id ? { ...msg, content: update.content, is_edited: update.is_edited, edited_at: update.edited_at } : msg
      ));
    });

    connection.on('MessageDeleted', (payload: { id: string }) => {
      setMessages(prev => prev.filter(msg => msg.id !== payload.id));
    });

    // Start connection and join all conversations
    startWithRetry(connection)
      .then(() => connection.invoke('JoinConversations', conversationIds))
      .catch(err => console.error('[ConversationHub] Failed to connect:', err));

    return () => {
      connection.stop();
      connectionRef.current = null;
    };
  }, [user, conversationIds]);

  useEffect(() => {
    if (user) {
      fetchConversations().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, fetchConversations]);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    sending,
    
    fetchConversations,
    fetchMessages,
    createConversation,
    sendMessage,
    markAsRead,
    joinConversation,
    leaveConversation,
    editMessage,
    deleteMessage,
    setCurrentConversation,
  };
};
