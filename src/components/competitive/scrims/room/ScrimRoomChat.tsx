import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Send, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useScrimConversation } from '@/hooks/competitive/useScrimConversation';
import {
  messagingKeys, useConversationMessages, useConversationRealtime, useConversations, useMarkRead, useSendMessage,
} from '@/hooks/useMessaging';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface Props {
  sessionId: string;
  opponentName: string;
  /** Open on arrival, e.g. while the two teams still have to agree a time. */
  openOnArrival: boolean;
}

const seenKey = (id: string) => `scrim-room-chat-seen:${id}`;
const readSeen = (id: string) => { try { return localStorage.getItem(seenKey(id)) === '1'; } catch { return false; } };
const writeSeen = (id: string) => { try { localStorage.setItem(seenKey(id), '1'); } catch { /* optional */ } };

const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * A floating chat in the scrim room: the inbox conversation with the other team, so the captains can
 * talk and settle a time without leaving the page. It opens by itself while a time is still to agree.
 */
export function ScrimRoomChat({ sessionId, opponentName, openOnArrival }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const conversationId = useScrimConversation(sessionId, true).data ?? '';
  const [open, setOpen] = useState(() => openOnArrival && !readSeen(sessionId));
  const [draft, setDraft] = useState('');
  const list = useRef<HTMLDivElement>(null);

  const messages = useConversationMessages(conversationId);
  const send = useSendMessage(conversationId);
  const markRead = useMarkRead(conversationId);
  const conversations = useConversations();
  const unread = conversations.data?.find((c) => c.id === conversationId)?.unreadCount ?? 0;
  const rows = messages.data?.pages.slice().reverse().flat() ?? [];
  const latestId = rows.at(-1)?.id;

  useConversationRealtime(conversationId, () => {
    void qc.invalidateQueries({ queryKey: messagingKeys.messages(conversationId) });
  }, !!conversationId);

  useEffect(() => { if (open && list.current) list.current.scrollTop = list.current.scrollHeight; }, [open, latestId]);
  useEffect(() => { if (open && latestId && unread > 0) markRead.mutate(latestId); }, [open, latestId, unread]); // eslint-disable-line react-hooks/exhaustive-deps

  function close() { setOpen(false); writeSeen(sessionId); }

  async function submit() {
    const content = draft.trim();
    if (!content || send.isPending || !conversationId) return;
    try { await send.mutateAsync({ content }); setDraft(''); } catch { /* shown below */ }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `Open chat, ${unread} unread` : 'Open chat'}
        className="fixed bottom-24 right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-black shadow-lg shadow-black/40 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black lg:bottom-6 lg:right-6"
      >
        <MessageSquare className="h-4 w-4" aria-hidden />
        Chat
        {unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[11px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
    );
  }

  return (
    <section
      aria-label={`Chat with ${opponentName}`}
      className="fixed bottom-24 right-4 z-40 flex h-[min(70dvh,520px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-xl border border-white/[0.12] bg-[#0e0e11] shadow-2xl shadow-black/60 lg:bottom-6 lg:right-6"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-white">{opponentName}</p>
          <p className="text-[11px] text-zinc-500">Agree a time here. Also in your <Link to={conversationId ? `/inbox/${conversationId}` : '/inbox'} className="underline underline-offset-2 hover:text-white">inbox</Link>.</p>
        </div>
        <button type="button" onClick={close} aria-label="Close chat" className="rounded p-1.5 text-white/55 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div ref={list} data-lenis-prevent className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3" aria-live="polite">
        {!conversationId || messages.isLoading ? <p className="text-[13px] text-zinc-500">Opening chat…</p> : null}
        {conversationId && messages.isError && !messages.data && <p role="alert" className="text-[13px] text-red-300">Messages could not load.</p>}
        {rows.map((m) => m.messageType === 'system' ? (
          <p key={m.id} className="py-1 text-center text-[12px] text-zinc-500">{m.content}</p>
        ) : (
          <div key={m.id} className={cn('flex flex-col', m.senderId === user?.id ? 'items-end' : 'items-start')}>
            {m.senderId !== user?.id && <span className="mb-0.5 text-[11px] text-zinc-500">{m.sender?.username ?? 'Captain'}</span>}
            <p className={cn('max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[13px]', m.senderId === user?.id ? 'bg-white text-black' : 'bg-white/[0.08] text-white')}>{m.content}</p>
            <time dateTime={m.createdAt} className="mt-0.5 text-[10px] text-zinc-600">{clock(m.createdAt)}</time>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-white/[0.08] p-3">
        {send.isError && <p role="alert" className="mb-2 text-[12px] text-red-300">Message could not be sent. Try again.</p>}
        <div className="flex items-end gap-2">
          <textarea
            aria-label="Message"
            rows={1}
            maxLength={2000}
            value={draft}
            placeholder="Write a message…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }}
            className="max-h-24 min-h-[40px] flex-1 resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[14px] text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
          />
          <button type="button" onClick={() => void submit()} disabled={!draft.trim() || send.isPending || !conversationId} aria-label="Send message"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
