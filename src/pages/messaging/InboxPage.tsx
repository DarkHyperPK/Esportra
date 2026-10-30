import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, MessageSquare, Search, Send, X } from 'lucide-react';
import { useInboxScroll } from '@/hooks/useInboxScroll';
import { useAuth } from '@/hooks/useAuth';
import { messagingKeys, useConversationMessages, useConversationRealtime, useConversations, useMarkRead, useSendMessage } from '@/hooks/useMessaging';
import type { Conversation } from '@/types/messaging';
import { LfgMessageReference } from './LfgMessageReference';
import './inbox.css';

function displayName(conversation: Conversation, userId?: string) {
  if (conversation.type === 'group') return conversation.title || 'Group conversation';
  const other = conversation.participants.find(participant => participant.userId !== userId);
  return other?.user?.username || other?.user?.fullName || 'Player';
}

function ConversationAvatar({ conversation, userId, name }: { conversation?: Conversation; userId?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const url = conversation?.type === 'direct' ? conversation.participants.find(participant => participant.userId !== userId)?.user?.avatarUrl : null;
  return <span className="inbox-avatar" aria-hidden>{url && !failed ? <img src={url} alt="" onError={() => setFailed(true)} /> : name.slice(0, 2).toUpperCase()}</span>;
}

function timeLabel(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return '';
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ConversationList({ conversations, userId, selectedId }: { conversations: Conversation[]; userId?: string; selectedId?: string }) {
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const visible = conversations.filter(item => (!unreadOnly || item.unreadCount > 0) && `${displayName(item, userId)} ${item.lastMessage?.content ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <>
    <div className="inbox-list-header"><div className="inbox-eyebrow">Messages</div><h1>Inbox</h1><p>Direct and group messages</p></div>
    <div className="inbox-list-tools"><label className="inbox-search"><Search size={16} aria-hidden /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />{search && <button type="button" aria-label="Clear conversation search" onClick={() => setSearch('')}><X size={14} aria-hidden /></button>}</label><button type="button" className="inbox-filter" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(!unreadOnly)}>Unread</button></div>
    <div className="inbox-conversation-list" data-lenis-prevent>{visible.length ? visible.map(item => {
      const name = displayName(item, userId);
      return <Link className={`inbox-conversation ${item.id === selectedId ? 'active' : ''}`} key={item.id} to={`/inbox/${item.id}`} aria-current={item.id === selectedId ? 'page' : undefined}>
        <ConversationAvatar conversation={item} userId={userId} name={name} /><span className="inbox-conversation-copy"><span className="inbox-conversation-title"><strong>{name}</strong><time>{timeLabel(item.lastMessage?.createdAt || item.createdAt)}</time></span><span className="inbox-conversation-preview">{item.lastMessage?.content || 'Start the conversation'}</span></span>{item.unreadCount > 0 && <span className="inbox-unread" aria-label={`${item.unreadCount} unread messages`}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</span>}
      </Link>;
    }) : <div className="inbox-empty"><MessageSquare size={22} aria-hidden /><strong>{conversations.length ? 'No conversations match.' : 'No conversations yet.'}</strong><p>{conversations.length ? 'Try another search or filter.' : 'Accept an LFG request to start a conversation.'}</p>{!conversations.length && <Link to="/competitive/lfg/requests">View requests</Link>}</div>}</div>
  </>;
}

function MessageThread({ id, userId, conversation }: { id: string; userId?: string; conversation?: Conversation }) {
  const queryClient = useQueryClient();
  const messages = useConversationMessages(id);
  const send = useSendMessage(id);
  const markRead = useMarkRead(id);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const rows = messages.data?.pages.slice().reverse().flat() ?? [];
  const { scroll, nearBottom, showLatest, jumpToLatest, onScroll } = useInboxScroll(rows.at(-1)?.id, messages.isSuccess);

  useEffect(() => {
    const latest = rows.at(-1);
    if (id && messages.isSuccess && latest && document.visibilityState === 'visible' && nearBottom.current) markRead.mutate(latest.id);
  }, [id, messages.isSuccess, rows.at(-1)?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const refetchMessages = messages.refetch;
  const latestMessageId = rows.at(-1)?.id;
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        if (nearBottom.current && latestMessageId) markRead.mutate(latestMessageId);
        void refetchMessages();
      }
    };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [refetchMessages, latestMessageId, id]); // eslint-disable-line react-hooks/exhaustive-deps
  useConversationRealtime(id, () => {
    void queryClient.invalidateQueries({ queryKey: messagingKeys.messages(id) });
    // Mark read only after the new message has rendered in the visible thread.
  });

  async function submit() {
    const content = draft.trim();
    if (!content || submitting.current || send.isPending || (messages.isError && !messages.data)) return;
    submitting.current = true;
    setError('');
    try { await send.mutateAsync({ content }); setDraft(current => current.trim() === content ? '' : current); jumpToLatest(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Message could not be sent. Try again.'); }
    finally { submitting.current = false; }
  }
  async function older() {
    const node = scroll.current;
    const height = node?.scrollHeight ?? 0;
    nearBottom.current = false;
    await messages.fetchNextPage();
    requestAnimationFrame(() => { if (node) node.scrollTop += node.scrollHeight - height; });
  }
  const name = conversation ? displayName(conversation, userId) : 'Conversation';
  const seenByMessage = new Map<string, string[]>();
  for (const participant of conversation?.participants ?? []) {
    if (participant.userId === userId || !participant.lastReadAt) continue;
    const seen = [...rows].reverse().find(message => message.senderId === userId && message.messageType === 'text' && Date.parse(message.createdAt) <= Date.parse(participant.lastReadAt!));
    if (seen) seenByMessage.set(seen.id, [...(seenByMessage.get(seen.id) ?? []), participant.user?.username || participant.user?.fullName || 'Player']);
  }
  return <section className="inbox-thread" aria-label={`Conversation with ${name}`}>
    <header className="inbox-thread-header"><Link to="/inbox" className="inbox-back" aria-label="Back to inbox"><ArrowLeft size={18} /></Link><ConversationAvatar conversation={conversation} userId={userId} name={name} /><div><h2>{name}</h2><p>{conversation?.type === 'group' ? 'Group conversation' : 'Direct conversation'}</p></div></header>
    <div className="inbox-message-stage">
    <div className="inbox-messages" data-lenis-prevent ref={scroll} tabIndex={0} aria-label="Message history" onScroll={() => { onScroll(); if (nearBottom.current && showLatest && !markRead.isPending) markRead.mutate(rows.at(-1)?.id); }}>
      {messages.isLoading ? <div className="inbox-thread-state">Loading messages…</div> : messages.isError && !messages.data ? <div className="inbox-thread-state" role="alert">Messages could not load. <button type="button" onClick={() => void messages.refetch()}>Try again</button></div> : <>
        {messages.hasNextPage && <button type="button" className="inbox-older" disabled={messages.isFetchingNextPage} onClick={() => void older()}>{messages.isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}</button>}
        {messages.isFetchNextPageError && <div className="inbox-thread-state" role="alert">Earlier messages could not load. Try again.</div>}
        {rows.length ? rows.map((message, index) => <Fragment key={message.id}>
          {(index === 0 || new Date(message.createdAt).toDateString() !== new Date(rows[index - 1].createdAt).toDateString()) && <div className="inbox-date"><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time></div>}
          <div className={`inbox-message ${message.senderId === userId ? 'own' : ''} ${message.listingReference ? 'has-listing' : ''}`}>
          {message.listingReference && <LfgMessageReference reference={message.listingReference} />}
          <div className="inbox-message-bubble">{message.content}</div><time dateTime={message.createdAt}>{timeLabel(message.createdAt)}{message.isEdited ? ' · Edited' : ''}</time>{seenByMessage.has(message.id) && <span className="inbox-read-receipt">{conversation?.type === 'group' ? `Seen by ${seenByMessage.get(message.id)!.join(', ')}` : 'Seen'}</span>}
        </div></Fragment>) : <div className="inbox-thread-state">Start the conversation.</div>}
      </>}
    </div>
    <span className="sr-only" role="status">{showLatest ? 'New messages arrived. Use the New messages button to jump to the latest reply.' : ''}</span>
    {showLatest && <button type="button" className="inbox-jump" onClick={() => { jumpToLatest(); markRead.mutate(rows.at(-1)?.id); }}><ArrowDown size={14} aria-hidden /> New messages</button>}
    </div>
    <div className="inbox-compose">{error && <p className="inbox-error" role="alert">{error}</p>}<div className="inbox-compose-row"><textarea aria-label="Message" placeholder="Write a message…" value={draft} maxLength={5000} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); } }} rows={2} /><button type="button" onClick={() => void submit()} disabled={!draft.trim() || send.isPending || (messages.isError && !messages.data)} aria-label="Send message"><Send size={17} aria-hidden /><span>{send.isPending ? 'Sending…' : 'Send'}</span></button></div><p>Enter to send · Shift + Enter for a new line</p></div>
  </section>;
}

export default function InboxPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const conversations = useConversations();
  useConversationRealtime('', () => {}, !id);
  const selected = conversations.data?.find(item => item.id === id);
  return <main className={`inbox-workspace ${id ? 'has-thread' : ''}`}><div className="inbox-shell"><section className="inbox-list" aria-label="Conversations">{conversations.isLoading ? <div className="inbox-thread-state">Loading conversations…</div> : conversations.isError && !conversations.data ? <div className="inbox-thread-state" role="alert">Conversations could not load. <button type="button" onClick={() => void conversations.refetch()}>Try again</button></div> : <ConversationList conversations={conversations.data ?? []} userId={user?.id} selectedId={id} />}</section>{id ? <MessageThread key={id} id={id} userId={user?.id} conversation={selected} /> : <section className="inbox-placeholder"><MessageSquare size={28} aria-hidden /><h2>Your conversations</h2><p>Select a conversation to read and reply.</p><Link to="/competitive/lfg">Find teammates</Link></section>}</div></main>;
}
