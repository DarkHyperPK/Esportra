import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useConversationMessages, useSendMessage, useMarkRead, useConversationRealtime } from '@/hooks/useMessaging';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { ConversationMessage } from '@/types/messaging';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg, isOwn }: { msg: ConversationMessage; isOwn: boolean }) {
  return (
    <div className={cn('flex gap-2 max-w-[80%]', isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
      {/* Avatar */}
      {!isOwn && (
        <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold text-white/70 shrink-0 mt-0.5 uppercase">
          {(msg.sender?.username ?? '?').charAt(0)}
        </div>
      )}

      <div className={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && msg.sender && (
          <span className="text-[11px] text-white/40 px-1">{msg.sender.username}</span>
        )}
        <div
          className={cn(
            'px-3 py-2 rounded-2xl text-[13px] leading-relaxed',
            isOwn
              ? 'bg-rose-500/90 text-white rounded-tr-sm'
              : 'bg-white/[0.08] text-white/90 rounded-tl-sm',
          )}
        >
          {msg.content}
        </div>
        <span className="text-[10px] text-white/25 px-1">{formatTime(msg.createdAt)}</span>
      </div>
    </div>
  );
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: messages, isLoading } = useConversationMessages(id ?? '');
  const sendMessage = useSendMessage(id ?? '');
  const markRead = useMarkRead(id ?? '');
  const [localMessages, setLocalMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync from server
  useEffect(() => {
    if (messages) setLocalMessages(messages);
  }, [messages]);

  // Mark read on open
  useEffect(() => {
    if (id) markRead.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Real-time: append new messages
  useConversationRealtime(id ?? '', (msg) => {
    setLocalMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    void qc.invalidateQueries({ queryKey: ['conversations', 'list'] });
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  async function handleSend() {
    const content = draft.trim();
    if (!content) return;
    setDraft('');
    setSending(true);
    try {
      await sendMessage.mutateAsync({ content });
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center gap-3">
        <Link to="/inbox" className="text-white/40 hover:text-white/80 transition-colors p-1 -ml-1">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-[15px] font-semibold text-white">Conversation</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-white/30" />
          </div>
        )}
        {!isLoading && localMessages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} isOwn={msg.senderId === user?.id} />
        ))}
        {!isLoading && localMessages.length === 0 && (
          <p className="text-center text-[13px] text-white/30 py-8">Start the conversation.</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/[0.08] flex gap-2 items-end">
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          className="flex-1 min-h-[40px] max-h-32 resize-none bg-white/[0.06] border-white/[0.12] text-white placeholder:text-white/30 text-[13px]"
          rows={1}
        />
        <Button
          onClick={() => void handleSend()}
          disabled={!draft.trim() || sending}
          size="sm"
          className="bg-rose-500 hover:bg-rose-600 text-white px-3 h-10 shrink-0"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
