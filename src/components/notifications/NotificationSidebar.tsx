import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { GhostButton, SuccessButton, DangerButton, SettingsButton } from '@/components/ui/app-buttons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Bell, CheckCheck, Users, ShieldAlert, Info, Shield, Check, X, Loader2, FileText, CheckCircle2, AlertTriangle, XCircle, Swords, Map, Trophy, Ticket, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from 'date-fns';
import { respondToOrgStaffInvite } from '@/lib/organizationStaff';
import { useToast } from '@/hooks/use-toast';
import { resolveCaptainMatchNotificationLinkAsync } from '@/utils/notificationLinks';
import { buildRedeemInvitePath, getTournamentInviteFromNotification } from '@/utils/tournamentInviteNotification';
import { getDenseScheduleNotificationMeta } from '@/utils/notificationDisplay';
import { MatchScheduleNotificationBody } from '@/components/notifications/MatchScheduleNotificationBody';
import { motion, AnimatePresence } from 'framer-motion';

type NotificationGroup = {
    label: string;
    notifications: any[];
};

const groupNotificationsByDate = (notifications: any[]): NotificationGroup[] => {
    const groups: Record<string, any[]> = {};

    notifications.forEach(n => {
        const date = new Date(n.created_at);
        let label: string;

        if (isToday(date)) {
            label = 'Today';
        } else if (isYesterday(date)) {
            label = 'Yesterday';
        } else if (isThisWeek(date)) {
            label = format(date, 'EEEE');
        } else {
            label = format(date, 'MMM d, yyyy');
        }

        if (!groups[label]) groups[label] = [];
        groups[label].push(n);
    });

    return Object.entries(groups).map(([label, notifications]) => ({ label, notifications }));
};

export const NotificationSidebar = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const [optimisticReadIds, setOptimisticReadIds] = useState<string[]>([]);
    const [processingInvites, setProcessingInvites] = useState<Record<string, 'accepting' | 'declining'>>({});
    const [resolvedInvites, setResolvedInvites] = useState<Record<string, 'accepted' | 'declined'>>({});
    const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<string | null>(null);

    const groupedNotifications = useMemo(() => groupNotificationsByDate(notifications), [notifications]);

    const handleMarkAllRead = useCallback(async () => {
        setOptimisticReadIds(prev => [...prev, ...notifications.filter(n => !n.is_read).map(n => n.id)]);
        await markAllAsRead();
    }, [notifications, markAllAsRead]);

    useEffect(() => {
        if (isOpen && unreadCount > 0) {
            handleMarkAllRead();
        }
    }, [isOpen, unreadCount, handleMarkAllRead]);

    const handleNotificationClick = async (notification: any) => {
        if (notification.type === 'staff_invite' && notification.data?.organization_staff_id) {
            return;
        }

        if (notification.type === 'tournament_announcement') {
            if (!notification.is_read) {
                setOptimisticReadIds(prev => [...prev, notification.id]);
                markAsRead(notification.id);
            }
            setExpandedAnnouncementId(prev => prev === notification.id ? null : notification.id);
            return;
        }

        if (!notification.is_read) {
            setOptimisticReadIds(prev => [...prev, notification.id]);
            if (!String(notification.id).startsWith('invite-')) {
                markAsRead(notification.id);
            }
        }

        setIsOpen(false);

        const destination =
            await resolveCaptainMatchNotificationLinkAsync(notification)
            ?? notification.link
            ?? notification.data?.link
            ?? null;

        if (destination) {
            navigate(destination);
        } else if (notification.type === 'team_invite') {
            navigate('/player/teams');
        } else if (notification.type === 'tournament_invite') {
            const invite = getTournamentInviteFromNotification(notification);
            if (invite?.data.code) {
                navigate(buildRedeemInvitePath(
                    invite.data.code,
                    invite.data.tournament_id ?? null,
                ));
            }
        }
    };

    const handleStaffInviteAction = async (notification: any, accept: boolean) => {
        const staffId = notification.data?.organization_staff_id;
        if (!staffId || !user?.id) return;

        const action = accept ? 'accepting' : 'declining';
        setProcessingInvites(prev => ({ ...prev, [notification.id]: action }));

        try {
            await respondToOrgStaffInvite({
                inviteId: staffId,
                accept,
                userId: user.id,
            });

            setResolvedInvites(prev => ({ ...prev, [notification.id]: accept ? 'accepted' : 'declined' }));

            if (!String(notification.id).startsWith('invite-')) {
                await markAsRead(notification.id);
            }
            setOptimisticReadIds(prev => [...prev, notification.id]);

            toast({
                title: accept ? "Invitation Accepted" : "Invitation Declined",
                description: accept
                    ? `You're now part of ${notification.data?.org_name || 'the organization'}. Redirecting...`
                    : "You've declined the staff invitation.",
            });

            if (accept) {
                setTimeout(() => {
                    setIsOpen(false);
                    navigate('/staff/dashboard');
                }, 1200);
            }

            await refreshNotifications();
        } catch (err: any) {
            toast({
                title: "Action failed",
                description: err.message || "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setProcessingInvites(prev => {
                const copy = { ...prev };
                delete copy[notification.id];
                return copy;
            });
        }
    };

    const typeBg = (type: string, isRead: boolean) => {
        if (isRead) return 'bg-white/[0.03] border-white/5';
        switch (type) {
            case 'team_invite': return 'bg-blue-500/15 border-blue-500/30';
            case 'team_invite_response': return 'bg-emerald-500/15 border-emerald-500/30';
            case 'team_announcement': return 'bg-amber-500/15 border-amber-500/30';
            case 'staff_invite': return 'bg-cyan-500/15 border-cyan-500/30';
            case 'result_reported': return 'bg-amber-500/15 border-amber-500/30';
            case 'result_disputed': return 'bg-red-500/15 border-red-500/30';
            case 'result_accepted': return 'bg-emerald-500/15 border-emerald-500/30';
            case 'dispute_filed': return 'bg-orange-500/15 border-orange-500/30';
            case 'dispute_resolved': return 'bg-emerald-500/15 border-emerald-500/30';
            case 'dispute_rejected': return 'bg-red-500/15 border-red-500/30';
            case 'tournament_announcement': return 'bg-rose-500/15 border-rose-500/30';
            case 'tournament_invite': return 'bg-violet-500/15 border-violet-500/30';
            case 'ban': return 'bg-red-500/15 border-red-500/30';
            case 'kick': return 'bg-orange-500/15 border-orange-500/30';
            case 'veto_your_turn':
            case 'match_ready': return 'bg-rose-500/15 border-rose-500/30';
            case 'match_schedule_changed': return 'bg-sky-500/15 border-sky-500/30';
            case 'br_game_schedule_changed':
            case 'br_lobby_schedule_changed': return 'bg-violet-500/15 border-violet-500/30';
            case 'veto_completed': return 'bg-blue-500/15 border-blue-500/30';
            case 'match_completed': return 'bg-amber-500/15 border-amber-500/30';
            default: return 'bg-zinc-500/15 border-zinc-500/30';
        }
    };

    const typeIcon = (type: string) => {
        switch (type) {
            case 'team_invite':
                return <Users className="h-4 w-4 text-blue-400" />;
            case 'team_invite_response':
                return <Users className="h-4 w-4 text-emerald-400" />;
            case 'team_announcement':
                return <Bell className="h-4 w-4 text-amber-400" />;
            case 'staff_invite':
                return <Shield className="h-4 w-4 text-cyan-400" />;
            case 'result_reported':
                return <FileText className="h-4 w-4 text-amber-400" />;
            case 'result_accepted':
                return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
            case 'result_disputed':
                return <ShieldAlert className="h-4 w-4 text-red-400" />;
            case 'dispute_filed':
                return <AlertTriangle className="h-4 w-4 text-orange-400" />;
            case 'dispute_resolved':
                return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
            case 'dispute_rejected':
                return <XCircle className="h-4 w-4 text-red-400" />;
            case 'tournament_announcement':
                return <Bell className="h-4 w-4 text-rose-400" />;
            case 'tournament_invite':
                return <Ticket className="h-4 w-4 text-violet-400" />;
            case 'ban':
                return <ShieldAlert className="h-4 w-4 text-red-500" />;
            case 'kick':
                return <ShieldAlert className="h-4 w-4 text-orange-500" />;
            case 'veto_your_turn':
            case 'match_ready':
                return <Swords className="h-4 w-4 text-rose-400" />;
            case 'match_schedule_changed':
                return <Calendar className="h-4 w-4 text-sky-400" />;
            case 'br_game_schedule_changed':
            case 'br_lobby_schedule_changed':
                return <Calendar className="h-4 w-4 text-violet-400" />;
            case 'veto_completed':
                return <Map className="h-4 w-4 text-blue-400" />;
            case 'match_completed':
                return <Trophy className="h-4 w-4 text-yellow-400" />;
            default:
                return <Info className="h-4 w-4 text-zinc-400" />;
        }
    };

    const renderNotificationContent = (n: any, index: number) => {
        const isRead = n.is_read || optimisticReadIds.includes(n.id);
        const isStaffInvite = n.type === 'staff_invite' && n.data?.organization_staff_id;
        const processing = processingInvites[n.id];
        const resolved = resolvedInvites[n.id];
        const scheduleMeta = getDenseScheduleNotificationMeta(n);

        return (
            <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className={cn(
                    "group w-full text-left px-5 py-4 transition-all duration-200 flex gap-4",
                    !isRead && "bg-gradient-to-r from-rose-500/[0.08] to-transparent",
                    isStaffInvite ? "cursor-default" : "cursor-pointer hover:bg-white/[0.04]"
                )}
                onClick={() => !isStaffInvite && handleNotificationClick(n)}
            >
                <div className={cn(
                    "mt-0.5 w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all duration-200",
                    typeBg(n.type, isRead),
                    !isRead && "shadow-lg shadow-black/20"
                )}>
                    {typeIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                            "text-[13px] font-medium leading-snug pr-2 transition-colors",
                            !isRead ? "text-white" : "text-zinc-400",
                            expandedAnnouncementId !== n.id && "line-clamp-2"
                        )}>
                            {n.title}
                        </p>
                        {!isRead && !isStaffInvite && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0 shadow-lg shadow-rose-500/50"
                            />
                        )}
                    </div>
                    <p className={cn(
                        "text-xs text-zinc-500 mt-1.5 leading-relaxed whitespace-pre-wrap break-words transition-all",
                        !scheduleMeta && expandedAnnouncementId !== n.id && "line-clamp-2"
                    )}>
                        {scheduleMeta ? null : n.message}
                    </p>

                    {scheduleMeta && (
                        <MatchScheduleNotificationBody notification={n} compact />
                    )}

                    {n.type === 'tournament_announcement' && (
                        <div className="flex items-center gap-3 mt-2.5">
                            <button className="text-[11px] text-rose-400/80 font-medium hover:text-rose-400 transition-colors">
                                {expandedAnnouncementId === n.id ? "Show less" : "Read more"}
                            </button>
                            {expandedAnnouncementId === n.id && n.link && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); navigate(n.link); }}
                                    className="text-[11px] text-blue-400/80 font-medium hover:text-blue-400 transition-colors"
                                >
                                    View Tournament →
                                </button>
                            )}
                        </div>
                    )}

                    {isStaffInvite && !resolved && (
                        <div className="flex items-center gap-2 mt-3">
                            <SuccessButton
                                size="sm"
                                disabled={!!processing}
                                onClick={(e) => { e.stopPropagation(); handleStaffInviteAction(n, true); }}
                                className="h-8 px-4 text-xs"
                            >
                                {processing === 'accepting' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                Accept
                            </SuccessButton>
                            <DangerButton
                                size="sm"
                                disabled={!!processing}
                                onClick={(e) => { e.stopPropagation(); handleStaffInviteAction(n, false); }}
                                className="h-8 px-4 text-xs"
                            >
                                {processing === 'declining' ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                                Decline
                            </DangerButton>
                        </div>
                    )}

                    {isStaffInvite && resolved && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "mt-2 text-xs font-semibold uppercase tracking-wider",
                                resolved === 'accepted' ? "text-emerald-400" : "text-red-400/70"
                            )}
                        >
                            {resolved === 'accepted' ? '✓ Accepted' : '✗ Declined'}
                        </motion.div>
                    )}

                    <p className="text-[10px] text-zinc-600 mt-2.5 tracking-wide">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                </div>
            </motion.div>
        );
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <SettingsButton
                    size="icon"
                    className="relative rounded-full"
                >
                    <Bell className="h-5 w-5" />
                    <AnimatePresence>
                        {unreadCount > 0 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg shadow-rose-500/50 ring-2 ring-black"
                            >
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </SettingsButton>
            </SheetTrigger>
            <SheetContent
                side="right"
                className="w-[480px] sm:w-[520px] p-0 border-l border-white/10 bg-[#08080a] z-[60]"
            >
                <SheetHeader className="px-6 py-5 border-b border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="font-heading font-semibold text-base text-white flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                                <Bell className="h-4 w-4 text-rose-400" />
                            </div>
                            <span>Notifications</span>
                            {unreadCount > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-rose-500/30"
                                >
                                    {unreadCount} new
                                </motion.span>
                            )}
                        </SheetTitle>
                        {notifications.length > 0 && (
                            <GhostButton
                                size="sm"
                                onClick={handleMarkAllRead}
                                className="h-8 px-3 text-xs gap-1.5"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark all read
                            </GhostButton>
                        )}
                    </div>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-85px)]">
                    <AnimatePresence mode="wait">
                        {notifications.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="flex flex-col items-center justify-center h-[400px] text-zinc-500 px-8 text-center"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 flex items-center justify-center mb-5">
                                    <Bell className="h-9 w-9 text-zinc-600" />
                                </div>
                                <p className="text-base font-medium text-zinc-400">All caught up!</p>
                                <p className="text-sm text-zinc-600 mt-2 max-w-[240px]">
                                    You have no new notifications. We'll let you know when something happens.
                                </p>
                            </motion.div>
                        ) : (
                            <div className="pb-6">
                                {groupedNotifications.map((group, groupIndex) => (
                                    <div key={group.label}>
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: groupIndex * 0.05 }}
                                            className="sticky top-0 z-10 px-5 py-2.5 bg-[#08080a]/95 backdrop-blur-sm border-b border-white/5"
                                        >
                                            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                                                {group.label}
                                            </p>
                                        </motion.div>
                                        <div className="divide-y divide-white/[0.03]">
                                            {group.notifications.map((n, index) => renderNotificationContent(n, index))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
};
