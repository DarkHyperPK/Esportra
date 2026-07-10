import React, { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { GhostButton, SuccessButton, DangerButton, SettingsButton } from '@/components/ui/app-buttons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Bell, CheckCheck, Users, ShieldAlert, Info, Shield, Check, X, Loader2, FileText, CheckCircle2, AlertTriangle, XCircle, Swords, Map, Trophy, Ticket, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { respondToOrgStaffInvite } from '@/lib/organizationStaff';
import { useToast } from '@/hooks/use-toast';
import { resolveCaptainMatchNotificationLinkAsync } from '@/utils/notificationLinks';
import { buildRedeemInvitePath, getTournamentInviteFromNotification } from '@/utils/tournamentInviteNotification';
import { getDenseScheduleNotificationMeta } from '@/utils/notificationDisplay';
import { MatchScheduleNotificationBody } from '@/components/notifications/MatchScheduleNotificationBody';

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

    const typeBg = (type: string) => {
        switch (type) {
            case 'team_invite': return 'bg-blue-500/10 border-blue-500/20';
            case 'team_invite_response': return 'bg-green-500/10 border-green-500/20';
            case 'team_announcement': return 'bg-amber-500/10 border-amber-500/20';
            case 'staff_invite': return 'bg-cyan-500/10 border-cyan-500/20';
            case 'result_reported': return 'bg-amber-500/10 border-amber-500/20';
            case 'result_disputed': return 'bg-red-500/10 border-red-500/20';
            case 'result_accepted': return 'bg-green-500/10 border-green-500/20';
            case 'dispute_filed': return 'bg-orange-500/10 border-orange-500/20';
            case 'dispute_resolved': return 'bg-green-500/10 border-green-500/20';
            case 'dispute_rejected': return 'bg-red-500/10 border-red-500/20';
            case 'tournament_announcement': return 'bg-rose-500/10 border-rose-500/20';
            case 'tournament_invite': return 'bg-violet-500/10 border-violet-500/20';
            case 'ban': return 'bg-red-500/10 border-red-500/20';
            case 'kick': return 'bg-orange-500/10 border-orange-500/20';
            case 'veto_your_turn':
            case 'match_ready': return 'bg-rose-500/10 border-rose-500/20';
            case 'match_schedule_changed': return 'bg-sky-500/10 border-sky-500/20';
            case 'br_game_schedule_changed':
            case 'br_lobby_schedule_changed': return 'bg-violet-500/10 border-violet-500/20';
            case 'veto_completed': return 'bg-blue-500/10 border-blue-500/20';
            case 'match_completed': return 'bg-amber-500/10 border-amber-500/20';
            default: return 'bg-zinc-500/10 border-zinc-500/20';
        }
    };

    const typeIcon = (type: string) => {
        switch (type) {
            case 'team_invite':
                return <Users className="h-4 w-4 text-blue-400" />;
            case 'team_invite_response':
                return <Users className="h-4 w-4 text-green-400" />;
            case 'team_announcement':
                return <Bell className="h-4 w-4 text-amber-400" />;
            case 'staff_invite':
                return <Shield className="h-4 w-4 text-cyan-400" />;
            case 'result_reported':
                return <FileText className="h-4 w-4 text-amber-400" />;
            case 'result_accepted':
                return <CheckCircle2 className="h-4 w-4 text-green-400" />;
            case 'result_disputed':
                return <ShieldAlert className="h-4 w-4 text-red-400" />;
            case 'dispute_filed':
                return <AlertTriangle className="h-4 w-4 text-orange-400" />;
            case 'dispute_resolved':
                return <CheckCircle2 className="h-4 w-4 text-green-400" />;
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

    const renderNotificationContent = (n: any) => {
        const isRead = n.is_read || optimisticReadIds.includes(n.id);
        const isStaffInvite = n.type === 'staff_invite' && n.data?.organization_staff_id;
        const processing = processingInvites[n.id];
        const resolved = resolvedInvites[n.id];
        const scheduleMeta = getDenseScheduleNotificationMeta(n);

        return (
            <div
                key={n.id}
                className={cn(
                    "w-full text-left px-4 py-4 transition-colors flex gap-3",
                    !isRead && "bg-rose-500/5",
                    isStaffInvite ? "cursor-default" : "cursor-pointer hover:bg-white/5"
                )}
                onClick={() => !isStaffInvite && handleNotificationClick(n)}
            >
                <div className={cn(
                    "mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
                    !isRead ? typeBg(n.type) : "bg-white/5 border-white/10"
                )}>
                    {typeIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium leading-tight pr-2", !isRead ? "text-white" : "text-gray-400", expandedAnnouncementId !== n.id && "truncate")}>
                        {n.title}
                    </p>
                    <p className={cn(
                        "text-xs text-gray-500 mt-1.5 leading-relaxed whitespace-pre-wrap break-words transition-all",
                        !scheduleMeta && expandedAnnouncementId !== n.id && "line-clamp-3"
                    )}>
                        {scheduleMeta ? null : n.message}
                    </p>

                    {scheduleMeta && (
                        <MatchScheduleNotificationBody notification={n} compact />
                    )}

                    {n.type === 'tournament_announcement' && (
                        <div className="flex items-center gap-3 mt-2">
                            <p className="text-[11px] text-rose-500/70 font-medium hover:text-rose-400 transition-colors">
                                {expandedAnnouncementId === n.id ? "Show less" : "Read more"}
                            </p>
                            {expandedAnnouncementId === n.id && n.link && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); navigate(n.link); }}
                                    className="text-[11px] text-blue-400/70 font-medium hover:text-blue-300 transition-colors"
                                >
                                    View Tournament
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
                        <div className={cn(
                            "mt-2 text-xs font-mono uppercase tracking-widest",
                            resolved === 'accepted' ? "text-emerald-400" : "text-red-400/70"
                        )}>
                            {resolved === 'accepted' ? 'Accepted' : 'Declined'}
                        </div>
                    )}

                    <p className="text-[11px] text-gray-600 mt-2 font-mono">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                </div>
                {!isRead && !isStaffInvite && (
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                )}
            </div>
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
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-black">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </SettingsButton>
            </SheetTrigger>
            <SheetContent
                side="right"
                className="w-[400px] sm:w-[440px] p-0 border-l border-white/10 bg-[#0a0a0c]"
            >
                <SheetHeader className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="font-heading font-semibold text-base text-white flex items-center gap-2.5">
                            <Bell className="h-5 w-5 text-rose-500" />
                            Notifications
                            {unreadCount > 0 && (
                                <span className="bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded-full text-xs font-medium">
                                    {unreadCount}
                                </span>
                            )}
                        </SheetTitle>
                        {unreadCount > 0 && (
                            <GhostButton
                                size="sm"
                                onClick={handleMarkAllRead}
                                className="h-7 px-2.5 text-xs"
                            >
                                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                                Mark all read
                            </GhostButton>
                        )}
                    </div>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-80px)]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 px-6 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                <Bell className="h-8 w-8 opacity-30" />
                            </div>
                            <p className="text-sm font-medium text-gray-400">No notifications</p>
                            <p className="text-xs text-gray-600 mt-1">You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {notifications.map((n) => renderNotificationContent(n))}
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
};
