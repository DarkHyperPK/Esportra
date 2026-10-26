import { Link } from 'react-router-dom';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useConversations } from '@/hooks/useMessaging';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/messaging';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ConversationRow({ conv, currentUserId }: { conv: Conversation; currentUserId: string | undefined }) {
  const other = conv.participants.find(p => p.userId !== currentUserId);
  const displayName = other?.user?.fullName ?? other?.user?.username ?? 'Unknown';
  const preview = conv.lastMessage?.content ?? 'No messages yet';
  const timestamp = conv.lastMessage?.createdAt ?? conv.createdAt;
  const hasUnread = conv.unreadCount > 0;

  return (
    <Link
      to={`/inbox/${conv.id}`}
      className={cn(
        'flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.06]',
        hasUnread && 'bg-white/[0.02]',
      )}
    >
      {/* Avatar */}
      <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-[13px] font-semibold text-white/80 shrink-0 uppercase">
        {displayName.charAt(0)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-[14px] truncate', hasUnread ? 'font-semibold text-white' : 'text-white/80')}>
            {displayName}
          </span>
          <span className="text-[11px] text-white/40 shrink-0">{formatTime(timestamp)}</span>
        </div>
        <p className={cn('text-[12px] truncate mt-0.5', hasUnread ? 'text-white/70' : 'text-white/40')}>
          {preview}
        </p>
      </div>

      {/* Unread badge */}
      {hasUnread && (
        <div className="h-5 min-w-5 px-1.5 rounded-full bg-rose-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
        </div>
      )}
    </Link>
  );
}

export default function InboxPage() {
  const { user } = useAuth();
  const { data: conversations, isLoading, isError } = useConversations();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-5 border-b border-white/[0.08]">
        <h1 className="text-[18px] font-semibold text-white">Inbox</h1>
        <p className="text-[13px] text-white/50 mt-0.5">Direct messages</p>
      </div>

      {/* List */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-white/30" />
        </div>
      )}
      {isError && (
        <div className="flex-1 flex items-center justify-center px-8 text-center">
          <p className="text-[13px] text-white/40">Could not load messages.</p>
        </div>
      )}
      {!isLoading && !isError && conversations?.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <MessageSquare className="h-8 w-8 text-white/20" />
          <p className="text-[14px] text-white/50">No conversations yet</p>
          <p className="text-[12px] text-white/30">
            Accept a recruitment interest to start a conversation.
          </p>
        </div>
      )}
      {!isLoading && conversations && conversations.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <ConversationRow key={conv.id} conv={conv} currentUserId={user?.id} />
          ))}
        </div>
      )}
    </div>
  );
}
