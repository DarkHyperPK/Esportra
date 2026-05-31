import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Minimize2, Maximize2, ChevronDown, ShieldCheck, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useMatchChat } from '@/hooks/useMatchChat';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface MatchChatProps {
    matchId: string;
    userTeamId: string | undefined;
    team1Id: string | undefined;
    team1Name: string;
    team2Name: string;
    allowMinimize?: boolean;
}

const MatchChat: React.FC<MatchChatProps> = ({
    matchId,
    userTeamId,
    team1Id,
    team1Name,
    team2Name,
    allowMinimize = true,
}) => {
    const { user } = useAuth();
    const { messages, sendMessage, scrollRef, scrollToBottom, isLoading, connectionStatus, isJoined } = useMatchChat(matchId);
    const [messageText, setMessageText] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const isConnected = connectionStatus === 'connected' && isJoined;
    const connectionLabel = isConnected
        ? 'Live'
        : connectionStatus === 'reconnecting'
            ? 'Reconnecting'
            : connectionStatus === 'disconnected'
                ? 'Disconnected'
                : 'Connecting';
    const ConnectionIcon = isConnected ? Wifi : connectionStatus === 'disconnected' ? WifiOff : Loader2;

    // Scroll to bottom on initial load
    useEffect(() => {
        if (messages && messages.length > 0) {
            setTimeout(scrollToBottom, 100);
        }
    }, [messages?.length]);

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
        inputRef.current?.focus();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getTeamBadge = (teamId: string | null) => {
        if (!teamId) return null;
        const isTeam1 = teamId === team1Id;
        return (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isTeam1
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-purple-500/20 text-purple-400'
                }`}>
                {isTeam1 ? team1Name : team2Name}
            </span>
        );
    };

    if (allowMinimize && isMinimized) {
        return (
            <Card className="bg-zinc-950/95 border-zinc-800 fixed bottom-4 right-4 w-72 z-50 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-900/70 transition-colors"
                    onClick={() => setIsMinimized(false)}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 text-cyan-400" />
                        </div>
                        <span className="text-white font-medium text-sm">Match Chat</span>
                        {messages && messages.length > 0 && (
                            <span className="bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 text-xs px-1.5 py-0.5 rounded-full">
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
            {/* Header */}
            <div className="p-4 bg-rose-500/5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-inner">
                        <MessageCircle className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <div className="text-white font-semibold text-sm">Match Chat</div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <ConnectionIcon className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : connectionStatus === 'disconnected' ? 'text-red-400' : 'text-amber-400 animate-spin'}`} />
                            <span>{connectionLabel}</span>
                        </div>
                    </div>
                </div>
                {allowMinimize && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-zinc-800/80 rounded-lg"
                        onClick={() => setIsMinimized(true)}
                    >
                        <Minimize2 className="w-4 h-4 text-zinc-400" />
                    </Button>
                )}
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.08),transparent_35%)]"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                    </div>
                ) : messages?.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3">
                            <MessageCircle className="w-6 h-6 text-zinc-500" />
                        </div>
                        <p className="text-zinc-300 text-sm font-medium">No messages yet</p>
                        <p className="text-zinc-600 text-xs mt-1">Coordinate schedule, server details, and check-in here.</p>
                    </div>
                ) : (
                    messages?.map((msg) => {
                        const isSystem = msg.message_type === 'system';
                        const isMe = msg.sender_id === user?.id;

                        if (isSystem) {
                            return (
                                <div key={msg.id} className="flex justify-center">
                                    <div className="bg-zinc-800/50 text-zinc-400 text-xs px-3 py-1.5 rounded-full">
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {!isMe && (
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 flex-shrink-0 mt-5">
                                        {(msg.sender_name || '?').slice(0, 1).toUpperCase()}
                                    </div>
                                )}
                                <div className={`flex flex-col max-w-[82%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        {getTeamBadge(msg.team_id)}
                                        <span className="text-xs text-zinc-400">
                                        {msg.sender_name}
                                            {msg.is_organizer && (
                                                <span className="inline-flex items-center gap-1 text-cyan-300 ml-1">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    ( organizer )
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-[11px] text-zinc-600">
                                            {format(new Date(msg.created_at), 'h:mm a')}
                                        </span>
                                    </div>
                                    <div className={`px-3.5 py-2.5 rounded-2xl border ${isMe
                                            ? 'bg-cyan-600/90 border-cyan-400/20 text-white rounded-br-md shadow-lg shadow-cyan-950/25'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-100 rounded-bl-md'
                                        }`}>
                                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Scroll to bottom button */}
            {showScrollButton && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
                    <Button
                        size="sm"
                        onClick={scrollToBottom}
                        className="rounded-full h-8 w-8 p-0 bg-zinc-800/95 hover:bg-zinc-700 shadow-lg border border-zinc-700"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-950/95 flex gap-2 flex-shrink-0">
                <Input
                    ref={inputRef}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isConnected ? 'Type a message...' : 'Connecting to live chat...'}
                    disabled={!isConnected || sendMessage.isPending}
                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-cyan-500/40 rounded-xl"
                />
                <Button
                    onClick={handleSend}
                    disabled={!messageText.trim() || sendMessage.isPending || !isConnected}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-500 px-3 rounded-xl shadow-lg shadow-cyan-950/30"
                >
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </Card>
    );
};

export default MatchChat;
