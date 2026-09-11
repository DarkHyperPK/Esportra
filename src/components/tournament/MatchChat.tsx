import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { GhostButton } from "@/components/ui/app-buttons";

import { MessageCircle, Send, Maximize2, ChevronDown, ShieldCheck, WifiOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import type { MatchMessage, ChatConnectionStatus } from '@/hooks/useMatchChat';

interface SendMessageMutation {
    mutateAsync: (vars: { content: string; teamId?: string; messageType?: string; metadata?: any }) => Promise<void>;
    isPending: boolean;
}

interface MatchChatProps {
    messages: MatchMessage[] | undefined;
    sendMessage: SendMessageMutation;
    scrollRef: React.RefObject<HTMLDivElement>;
    scrollToBottom: () => void;
    isLoading: boolean;
    connectionStatus: ChatConnectionStatus;
    isJoined: boolean;
    chatError: string | null;
    isError: boolean;
    opponentLastReadAt: Date | null;
    userTeamId: string | undefined;
    team1Id: string | undefined;
    team1Name: string;
    team2Name: string;
    allowMinimize?: boolean;
}

const MatchChat: React.FC<MatchChatProps> = ({
    messages,
    sendMessage,
    scrollRef,
    scrollToBottom,
    isLoading,
    connectionStatus,
    isJoined,
    chatError,
    isError,
    opponentLastReadAt,
    userTeamId,
    allowMinimize = true,
}) => {
    const { user } = useAuth();
    const [messageText, setMessageText] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const isConnected = connectionStatus === 'connected' && isJoined;

    const lastSeenMessageId = (() => {
        if (!opponentLastReadAt) return null;
        const myMessages = (messages ?? []).filter(m => m.sender_id === user?.id);
        return [...myMessages]
            .reverse()
            .find(m => opponentLastReadAt >= new Date(m.created_at))
            ?.id ?? null;
    })();

    // Scroll to bottom on initial load
    useEffect(() => {
        if (messages && messages.length > 0) {
            setTimeout(scrollToBottom, 100);
        }
    }, [messages, scrollToBottom]);

    // Track scroll position for "scroll to bottom" button
    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShowScrollButton(!isNearBottom);
        }
    };

    const handleSend = async () => {
        if (!messageText.trim()) return;

        try {
            await sendMessage.mutateAsync({
                content: messageText.trim(),
                teamId: userTeamId,
            });
        } catch {
            return;
        }

        setMessageText('');
        if (inputRef.current) { inputRef.current.style.height = 'auto'; }
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };


    if (allowMinimize && isMinimized) {
        return (
            <Card className="bg-zinc-950/95 border-zinc-800 fixed bottom-4 right-4 w-72 z-50 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-900/70 transition-colors"
                    onClick={() => setIsMinimized(false)}
                >
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-200 font-medium text-sm">Match Chat</span>
                        {messages && messages.length > 0 && (
                            <span className="bg-zinc-700/60 text-zinc-400 text-xs px-1.5 py-0.5 rounded-full">
                                {messages.length}
                            </span>
                        )}
                    </div>
                    <Maximize2 className="w-4 h-4 text-zinc-400" />
                </div>
            </Card>
        );
    }

    return (
        <Card className="bg-zinc-950/95 border-zinc-800/90 overflow-hidden flex flex-col h-[440px] shadow-2xl shadow-black/30 backdrop-blur-xl">
            {/* Messages */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 min-h-0" data-lenis-prevent
            >
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                    </div>
                ) : isError ? (
                    <div className="text-center py-12 px-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
                            <WifiOff className="w-6 h-6 text-red-400" />
                        </div>
                        <p className="text-red-300 text-sm font-medium">Match chat unavailable</p>
                        <p className="text-zinc-500 text-xs mt-2">{chatError || 'You may not have access to this match chat yet.'}</p>
                    </div>
                ) : (
                    <>
                        {chatError && (
                            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                                {chatError}
                            </div>
                        )}
                        {messages?.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3">
                            <MessageCircle className="w-6 h-6 text-zinc-500" />
                        </div>
                        <p className="text-zinc-300 text-sm font-medium">No messages yet</p>
                        <p className="text-zinc-600 text-xs mt-1">Coordinate schedule, server details, and check-in here.</p>
                    </div>
                ) : (
                    (messages ?? []).map((msg, index, arr) => {
                        const isSystem = msg.message_type === 'system';
                        const isMe = msg.sender_id === user?.id;
                        const prev = arr[index - 1];
                        const next = arr[index + 1];
                        const isFirstInGroup = !prev || prev.sender_id !== msg.sender_id || prev.message_type === 'system' || isSystem;
                        const isLastInGroup  = !next || next.sender_id !== msg.sender_id || next.message_type === 'system' || isSystem;
                        const topGap = index === 0 ? 'mt-2' : isFirstInGroup ? 'mt-4' : 'mt-0.5';

                        if (isSystem) {
                            return (
                                <div key={msg.id} className={`flex justify-center ${topGap}`}>
                                    <div className="bg-zinc-800/50 text-zinc-400 text-xs px-3 py-1.5 rounded-full">
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        }

                        const myAvatarUrl = user?.user_metadata?.avatar_url as string | undefined;
                        const avatarContent = isMe
                            ? myAvatarUrl
                                ? <img src={myAvatarUrl} className="w-full h-full object-cover" alt="" />
                                : <span className="text-xs font-medium text-zinc-300">{(user?.email ?? '?')[0].toUpperCase()}</span>
                            : <span className="text-xs font-semibold text-zinc-400">{(msg.sender_name ?? '?')[0].toUpperCase()}</span>;

                        const avatarEl = (
                            <div className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${myAvatarUrl && isMe ? '' : 'bg-zinc-800'}`}>
                                {avatarContent}
                            </div>
                        );

                        return (
                            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} ${topGap}`}>
                                {!isMe && (isLastInGroup ? avatarEl : <div className="w-7 flex-shrink-0" />)}

                                <div className={`flex flex-col max-w-[78%] min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                                    {isFirstInGroup && (
                                        <span className="text-[11px] text-zinc-600 mb-1 px-1">
                                            {isMe ? 'You' : msg.sender_name}
                                            {msg.is_organizer && (
                                                <span className="inline-flex items-center gap-0.5 text-zinc-500 ml-1">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    organizer
                                                </span>
                                            )}
                                        </span>
                                    )}
                                    <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${isMe
                                            ? 'bg-zinc-700/70 text-zinc-100'
                                            : 'bg-zinc-900/80 text-zinc-200'
                                        }`}>
                                        {msg.content}
                                    </div>
                                    {isLastInGroup && (
                                        <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                            <span className="text-[11px] text-zinc-600">
                                                {format(new Date(msg.created_at), 'h:mm a')}
                                            </span>
                                            {msg.id === lastSeenMessageId && opponentLastReadAt && (
                                                <span className="text-[11px] text-zinc-500">· Seen</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {isMe && (isLastInGroup ? avatarEl : <div className="w-7 flex-shrink-0" />)}
                            </div>
                        );
                    })
                )}
                    </>
                )}
            </div>

            {/* Scroll to bottom button */}
            {showScrollButton && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
                    <GhostButton
                        size="sm"
                        onClick={scrollToBottom}
                        className="rounded-full h-8 w-8 p-0 shadow-lg"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </GhostButton>
                </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-950/95 flex gap-2 flex-shrink-0">
                <textarea
                    ref={inputRef}
                    value={messageText}
                    onChange={(e) => { setMessageText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                    onKeyDown={handleKeyDown}
                    placeholder={isConnected ? 'Type a message...' : 'Connecting to live chat...'}
                    disabled={!isConnected || sendMessage.isPending}
                    rows={1}
                    className="bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600/40 rounded-xl px-3 py-2 text-sm resize-none overflow-y-auto min-h-0 leading-relaxed w-full"
                    style={{ maxHeight: '96px' }}
                />
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!messageText.trim() || sendMessage.isPending || !isConnected}
                    className="inline-flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800/50 disabled:text-zinc-600 px-3 h-10 rounded-xl transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </Card>
    );
};

export default MatchChat;
