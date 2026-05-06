import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Minimize2, Maximize2, ChevronDown } from 'lucide-react';
import { useMatchChat } from '@/hooks/useMatchChat';
import { useAuth } from '@/contexts/AuthContext';
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
    const { messages, sendMessage, scrollRef, scrollToBottom, isLoading } = useMatchChat(matchId);
    const [messageText, setMessageText] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

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
            <Card className="bg-zinc-900/90 border-zinc-800 fixed bottom-4 right-4 w-72 z-50 shadow-2xl">
                <div
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors"
                    onClick={() => setIsMinimized(false)}
                >
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-cyan-400" />
                        <span className="text-white font-medium text-sm">Match Chat</span>
                        {messages && messages.length > 0 && (
                            <span className="bg-cyan-500 text-white text-xs px-1.5 py-0.5 rounded-full">
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
        <Card className="bg-zinc-900/90 border-zinc-800 overflow-hidden flex flex-col h-[400px]">
            {/* Header */}
            <div className="p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-cyan-400" />
                    <span className="text-white font-medium text-sm">Match Chat</span>
                </div>
                {allowMinimize && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-zinc-800"
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
                className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    </div>
                ) : messages?.length === 0 ? (
                    <div className="text-center py-8">
                        <MessageCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-zinc-500 text-sm">No messages yet</p>
                        <p className="text-zinc-600 text-xs mt-1">Start chatting to coordinate your match</p>
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
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {getTeamBadge(msg.team_id)}
                                    <span className="text-xs text-zinc-500">{msg.sender_name}</span>
                                    <span className="text-xs text-zinc-600">
                                        {format(new Date(msg.created_at), 'h:mm a')}
                                    </span>
                                </div>
                                <div className={`max-w-[80%] px-3 py-2 rounded-lg ${isMe
                                        ? 'bg-cyan-600 text-white rounded-br-none'
                                        : 'bg-zinc-800 text-white rounded-bl-none'
                                    }`}>
                                    <p className="text-sm break-words">{msg.content}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Scroll to bottom button */}
            {showScrollButton && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
                    <Button
                        size="sm"
                        onClick={scrollToBottom}
                        className="rounded-full h-8 w-8 p-0 bg-zinc-800 hover:bg-zinc-700 shadow-lg"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-zinc-800 flex gap-2 flex-shrink-0">
                <Input
                    ref={inputRef}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
                <Button
                    onClick={handleSend}
                    disabled={!messageText.trim() || sendMessage.isPending}
                    className="bg-cyan-600 hover:bg-cyan-700 px-3"
                >
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </Card>
    );
};

export default MatchChat;
