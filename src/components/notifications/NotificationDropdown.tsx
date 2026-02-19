import React, { useState } from 'react';
import { useNotifications } from '@/components/NotificationContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, CheckCheck, Trash2, Users, ShieldAlert, Info, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const NotificationDropdown = () => {
    const { notifications, unreadCount, markAsRead, refreshNotifications } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    // Optimistic UI for read status in dropdown (local only, context handles global)
    const [optimisticReadIds, setOptimisticReadIds] = useState<string[]>([]);

    // Limit shown notifications in dropdown
    const recentNotifications = notifications.slice(0, 10);
    const hasMore = notifications.length > 10;

    const handleMarkAllRead = async () => {
        // Optimistically mark all visible as read
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        setOptimisticReadIds(prev => [...prev, ...unreadIds]); // Visual update

        for (const id of unreadIds) {
            if (!String(id).startsWith('invite-')) {
                await markAsRead(id);
            }
        }
        await refreshNotifications();
    };

    const handleNotificationClick = async (notification: any) => {
        if (!notification.is_read) {
            setOptimisticReadIds(prev => [...prev, notification.id]);
            if (!String(notification.id).startsWith('invite-')) {
                markAsRead(notification.id); // Fire and forget
            }
        }

        setIsOpen(false);

        if (notification.link) {
            navigate(notification.link);
        } else if (notification.type === 'team_invite') {
            // Fallback if no link exists for some reason
            navigate('/player/teams');
        }
    };

    const typeIcon = (type: string) => {
        switch (type) {
            case 'team_invite':
                return <Users className="h-4 w-4 text-blue-400" />;
            case 'ban':
            case 'kick':
                return <ShieldAlert className="h-4 w-4 text-red-500" />;
            case 'team_invite_response':
                return <Users className="h-4 w-4 text-green-400" />;
            default:
                return <Info className="h-4 w-4 text-gray-400" />;
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-black">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-[380px] p-0 border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-2xl rounded-xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                    <h4 className="font-heading font-semibold text-sm text-white flex items-center gap-2">
                        Notifications
                        {unreadCount > 0 && (
                            <span className="bg-gaming-purple/20 text-gaming-purple px-1.5 py-0.5 rounded text-[10px]">
                                {unreadCount} new
                            </span>
                        )}
                    </h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllRead}
                            className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/10"
                        >
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* List */}
                <ScrollArea className="h-[350px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-gray-500 px-6 text-center">
                            <Bell className="h-8 w-8 mb-3 opacity-20" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {recentNotifications.map((n) => {
                                const isRead = n.is_read || optimisticReadIds.includes(n.id);
                                return (
                                    <button
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={cn(
                                            "w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex gap-3",
                                            !isRead && "bg-gaming-purple/5"
                                        )}
                                    >
                                        <div className={cn(
                                            "mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-white/10",
                                            !isRead ? "bg-gaming-purple/10" : "bg-white/5"
                                        )}>
                                            {typeIcon(n.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn("text-sm font-medium leading-none truncate pr-2", !isRead ? "text-white" : "text-gray-400")}>
                                                {n.title}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] text-gray-600 mt-1.5 font-mono">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {!isRead && (
                                            <div className="w-2 h-2 rounded-full bg-gaming-purple mt-2 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                <div className="p-2 border-t border-white/10 bg-white/5">
                    <Button
                        variant="ghost"
                        className="w-full justify-between text-xs text-gray-400 hover:text-white hover:bg-white/10"
                        onClick={() => {
                            setIsOpen(false);
                            navigate('/notifications');
                        }}
                    >
                        View all notifications
                        <ArrowRight className="h-3 w-3" />
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};
