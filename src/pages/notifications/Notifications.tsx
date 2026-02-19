import React, { useMemo, useState } from 'react';
import { useNotifications } from '@/components/NotificationContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Trash2, CheckCheck, Bell, Inbox, ShieldAlert, Users, Info, ExternalLink, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionTiles } from '@/components/effects/MotionTiles';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NotificationsPage = () => {
  const { notifications, markAsRead, refreshNotifications } = useNotifications();
  const [selected, setSelected] = useState<null | typeof notifications[0]>(null);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'invites' | 'system'>('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Optimistic UI state
  const [optimisticIds, setOptimisticIds] = useState<string[]>([]);

  // Helper to hide notification instantly
  const hideOptimistically = (id: string) => {
    setOptimisticIds(prev => [...prev, id]);
  };

  // Helper to revert if failed
  const revertOptimistic = (id: string) => {
    setOptimisticIds(prev => prev.filter(i => i !== id));
  };

  // Accept team invite logic
  const handleAcceptInvite = async (notification: any) => {
    const notifId = notification.id;
    try {
      // 1. Optimistic Update: Hide instantly
      hideOptimistically(notifId);
      toast({ title: 'Joining team...', duration: 1000 }); // Feedback

      // 2. Background Operations
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user?.id).single();

      if (profile?.is_admin) {
        throw new Error('Admins cannot join teams');
      }

      const { data: invite, error: inviteErr } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('invited_user_id', notification.user_id)
        .eq('team_id', notification.team_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (inviteErr) throw inviteErr;
      if (!invite) throw new Error('Invite not found or expired');

      const { error: addErr } = await supabase.from('team_members').upsert({
        team_id: invite.team_id,
        user_id: invite.invited_user_id,
        role: 'member',
        is_active: true,
        joined_at: new Date().toISOString()
      }, { onConflict: 'team_id,user_id' });
      if (addErr) throw addErr;

      await supabase.from('team_invitations').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', invite.id);

      if (notification.id && !String(notification.id).startsWith('invite-')) {
        await markAsRead(notification.id);
      }

      // Notify inviter
      await supabase.from('notifications').insert({
        user_id: invite.invited_by_user_id,
        type: 'team_invite_response',
        title: 'Team Invite Accepted',
        message: 'An invited player accepted your team invite.',
        team_id: invite.team_id,
        is_read: false
      });

      // 3. Success Feedback
      toast({ title: 'Joined team successfully!', variant: 'default' });
      await refreshNotifications(); // Sync real state
      window.dispatchEvent(new CustomEvent('teamInviteAccepted'));
    } catch (e: any) {
      console.error(e);
      // 4. Revert on Error
      revertOptimistic(notifId);
      toast({ title: 'Error accepting invite', description: e.message, variant: 'destructive' });
    }
  };

  // Reject invite logic
  const handleRejectInvite = async (notification: any) => {
    const notifId = notification.id;
    try {
      hideOptimistically(notifId);

      const { data: invite } = await supabase.from('team_invitations').select('*').eq('invited_user_id', notification.user_id).eq('team_id', notification.team_id).eq('status', 'pending').maybeSingle();
      if (!invite) throw new Error('Invite not found');

      await supabase.from('team_invitations').update({ status: 'rejected', responded_at: new Date().toISOString() }).eq('id', invite.id);

      if (notification.id && !String(notification.id).startsWith('invite-')) await markAsRead(notification.id);

      await supabase.from('notifications').insert({
        user_id: invite.invited_by_user_id,
        type: 'team_invite_response',
        title: 'Team Invite Rejected',
        message: 'An invited player rejected your team invite.',
        team_id: invite.team_id,
        is_read: false
      });

      toast({ title: 'Invite rejected', variant: 'default' });
      await refreshNotifications();
    } catch (e: any) {
      console.error(e);
      revertOptimistic(notifId);
      toast({ title: 'Error rejecting invite', variant: 'destructive' });
    }
  };

  // Delete single notification
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      setIsDeleting(true);
      if (String(notificationId).startsWith('invite-')) {
        const inviteId = notificationId.replace('invite-', '');
        await supabase.from('team_invitations').delete().eq('id', inviteId);
      } else {
        await supabase.from('notifications').delete().eq('id', notificationId);
      }
      toast({ title: 'Deleted', variant: 'default' });
      await refreshNotifications();
    } catch (error) {
      toast({ title: 'Error deleting', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedNotifications.length === 0) return;
    try {
      setIsDeleting(true);
      const syntheticIds = selectedNotifications.filter(id => String(id).startsWith('invite-'));
      const regularIds = selectedNotifications.filter(id => !String(id).startsWith('invite-'));

      if (syntheticIds.length > 0) {
        await supabase.from('team_invitations').delete().in('id', syntheticIds.map(id => id.replace('invite-', '')));
      }
      if (regularIds.length > 0) {
        await supabase.from('notifications').delete().in('id', regularIds);
      }

      toast({ title: 'Deleted selected', variant: 'default' });
      setSelectedNotifications([]);
      await refreshNotifications();
    } catch (error) {
      toast({ title: 'Error deleting', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Mark all read
  const handleMarkAllRead = async () => {
    try {
      const regularIds = notifications.filter(n => !n.is_read && !String(n.id).startsWith('invite-')).map(n => n.id);
      if (regularIds.length > 0) {
        await supabase.from('notifications').update({ is_read: true }).in('id', regularIds);
        toast({ title: 'All marked as read', variant: 'default' });
        await refreshNotifications();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const typeMeta = (n: any) => {
    switch (n.type) {
      case 'team_invite': return { icon: <Users className="h-4 w-4" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
      case 'ban': return { icon: <ShieldAlert className="h-4 w-4" />, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' };
      case 'kick': return { icon: <ShieldAlert className="h-4 w-4" />, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' };
      case 'team_invite_response': return { icon: <Users className="h-4 w-4" />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
      default: return { icon: <Info className="h-4 w-4" />, color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' };
    }
  };

  const filtered = useMemo(() => {
    let result = notifications.filter(n => !optimisticIds.includes(n.id));
    if (filter === 'unread') return result.filter(n => !n.is_read);
    if (filter === 'invites') return result.filter(n => n.type === 'team_invite');
    if (filter === 'system') return result.filter(n => n.type !== 'team_invite');
    return result;
  }, [notifications, filter, optimisticIds]);

  return (
    <div className="min-h-screen relative bg-[#050507] overflow-hidden text-white">
      <MotionTiles />

      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              Notification Center
            </h1>
            <p className="text-white/40 mt-1 font-light">Stay updated with your latest activities</p>
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center gap-3">
              {selectedNotifications.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedNotifications.length})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className="border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'invites', label: 'Invites' },
            { id: 'system', label: 'System' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id as any)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 border",
                filter === t.id
                  ? "bg-gaming-purple/20 border-gaming-purple text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                  : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white hover:border-white/10"
              )}
            >
              {t.label}
            </button>
          ))}

          {filtered.length > 0 && (
            <button
              onClick={() => selectedNotifications.length === filtered.length ? setSelectedNotifications([]) : setSelectedNotifications(filtered.map(n => n.id))}
              className="ml-auto text-xs font-medium text-white/40 hover:text-white transition-colors"
            >
              {selectedNotifications.length === filtered.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3 min-h-[400px]">
          <AnimatePresence mode='popLayout'>
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-20 border border-white/5 rounded-3xl bg-black/20 backdrop-blur-sm"
              >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Inbox className="h-8 w-8 text-white/20" />
                </div>
                <h3 className="text-lg font-medium text-white/60">All caught up!</h3>
                <p className="text-white/30 text-sm mt-1">No new notifications to show</p>
              </motion.div>
            ) : (
              filtered.map((n, i) => {
                const meta = typeMeta(n);
                return (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border transition-all duration-300",
                      selectedNotifications.includes(n.id)
                        ? "bg-gaming-purple/10 border-gaming-purple/40"
                        : !n.is_read
                          ? "bg-[#0f0f12] border-white/10 shadow-lg shadow-black/50"
                          : "bg-black/20 border-white/5 opacity-80 hover:opacity-100"
                    )}
                  >
                    {/* Selection Checkbox Overlay */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-black/80 to-transparent">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(n.id)}
                        onChange={() => toggleNotificationSelection(n.id)}
                        className="w-4 h-4 rounded border-white/20 bg-black/50 checked:bg-gaming-purple checked:border-gaming-purple transition-all cursor-pointer"
                      />
                    </div>

                    <div
                      onClick={() => {
                        if (!n.is_read) markAsRead(n.id);
                        if (n.link) navigate(n.link);
                        else if (n.type === 'team_invite') navigate('/player/teams');
                      }}
                      className={cn(
                        "flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 pl-4 group-hover:pl-12 transition-[padding] cursor-pointer",
                        !n.is_read && "bg-gradient-to-r from-white/5 to-transparent"
                      )}
                    >
                      {/* Icon */}
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner", meta.bg)}>
                        {meta.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={cn("font-medium text-sm sm:text-base truncate", !n.is_read ? "text-white" : "text-white/60")}>
                            {n.title}
                          </h4>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-gaming-purple animate-pulse" />
                          )}
                        </div>
                        <p className="text-white/50 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>

                        {/* Helper for Invites */}
                        {n.type === 'team_invite' && (
                          <div className="flex items-center gap-1 mt-2 text-gaming-purple text-[10px] font-medium uppercase tracking-wider">
                            <span>Manage in Teams</span>
                            <ArrowRight className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </div>

                      {/* Meta & Actions */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-1 ml-auto">
                        <span className="text-[10px] font-mono text-white/30 whitespace-nowrap">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>

                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Delete Button */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-white/20 hover:text-red-400 hover:bg-red-500/10"
                            onClick={(e) => { e.stopPropagation(); handleDeleteNotification(n.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>

                          {/* Link Button */}
                          {n.link && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-white/20 hover:text-white hover:bg-white/10"
                              onClick={(e) => { e.stopPropagation(); navigate(n.link!); }}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-[#121212] border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Notifications?</DialogTitle>
            <DialogDescription className="text-white/60">
              This action cannot be undone. You are about to delete {selectedNotifications.length} notification(s).
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeleteConfirm(false);
                handleBulkDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationsPage;