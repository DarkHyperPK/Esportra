import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch user's conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            *,
            user:profiles(id, username, full_name, avatar_url)
          ),
          last_message:messages(
            *,
            sender:profiles(id, username, full_name, avatar_url)
          )
        `)
        .eq('participants.user_id', user.id)
        .eq('participants.is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Process conversations to add unread counts
      const processedConversations = await Promise.all(
        (data || []).map(async (conv) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .gt('created_at', conv.participants?.[0]?.last_read_at || '1970-01-01');

          return {
            ...conv,
            unread_count: count || 0,
          };
        })
      );

      setConversations(processedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [user]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, username, full_name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  // Create a new conversation
  const createConversation = async (participantIds: string[], type: 'direct' | 'group' = 'direct', title?: string) => {
    if (!user) return null;

    try {
      setSending(true);

      // For direct messages, check if conversation already exists
      if (type === 'direct' && participantIds.length === 1) {
        const { data: existingConv } = await supabase
          .from('conversations')
          .select(`
            *,
            participants:conversation_participants(*)
          `)
          .eq('type', 'direct')
          .eq('participants.user_id', user.id)
          .eq('participants.is_active', true);

        const directConv = existingConv?.find(conv => 
          conv.participants.some((p: any) => p.user_id === participantIds[0])
        );

        if (directConv) {
          setCurrentConversation(directConv);
          await fetchMessages(directConv.id);
          return directConv;
        }
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type,
          title,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const participants = [
        { conversation_id: conversation.id, user_id: user.id },
        ...participantIds.map(id => ({ conversation_id: conversation.id, user_id: id }))
      ];

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

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

  // Send a message
  const sendMessage = async (conversationId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text', attachments: any = {}) => {
    if (!user) return null;

    try {
      setSending(true);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: messageType,
          attachments,
        })
        .select(`
          *,
          sender:profiles(id, username, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Add message to current messages
      setMessages(prev => [...prev, data]);

      // Update conversations list
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

  // Mark messages as read
  const markAsRead = async (conversationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      await fetchConversations();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Join a conversation
  const joinConversation = async (conversationId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
        });

      if (error) throw error;

      await fetchConversations();
      return true;
    } catch (error: any) {
      console.error('Error joining conversation:', error);
      return false;
    }
  };

  // Leave a conversation
  const leaveConversation = async (conversationId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ is_active: false })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchConversations();
      setCurrentConversation(null);
      setMessages([]);
      return true;
    } catch (error: any) {
      console.error('Error leaving conversation:', error);
      return false;
    }
  };

  // Edit a message
  const editMessage = async (messageId: string, newContent: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({
          content: newContent,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('sender_id', user?.id)
        .select()
        .single();

      if (error) throw error;

      // Update messages list
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

  // Delete a message
  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user?.id);

      if (error) throw error;

      // Remove from messages list
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

  // Memoize conversation IDs to prevent subscription remounts
  const conversationIds = useMemo(() => {
    return conversations.map(c => c.id);
  }, [conversations]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || conversationIds.length === 0) return;

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=in.(${conversationIds.join(',')})`,
      }, (payload) => {
        const newMessage = payload.new as Message;
        
        // Add to current messages if it's the active conversation
        if (currentConversation && newMessage.conversation_id === currentConversation.id) {
          setMessages(prev => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }

        // Update conversations list directly - update the conversation's last_message and updated_at
        setConversations(prev => {
          return prev.map(conv => {
            if (conv.id === newMessage.conversation_id) {
              return {
                ...conv,
                last_message: newMessage,
                updated_at: newMessage.created_at,
                unread_count: currentConversation?.id === conv.id 
                  ? (conv.unread_count || 0) 
                  : (conv.unread_count || 0) + 1,
              };
            }
            return conv;
          }).sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        });
      })
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
    };
  }, [user, conversationIds, currentConversation]); // Removed fetchConversations from dependencies

  // Initialize data
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
    
    // Actions
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
