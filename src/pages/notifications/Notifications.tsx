import React, { useMemo, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Trash2, CheckCheck, Bell, Inbox, ShieldAlert, Users, Info, ExternalLink, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';



const NotificationsPage = () => {
  const { notifications, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'invites' | 'system'>('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Optimistic UI state
  const [optimisticIds, _setOptimisticIds] = useState<string[]>([]);

  // Delete single notification
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      setIsDeleting(true);
      await apiClient.delete(`/api/notifications/${notificationId}`);
      toast({ title: 'Deleted', variant: 'default' });
      await refreshNotifications();
    } catch {
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
      await apiClient.post('/api/notifications/bulk-delete', { ids: selectedNotifications });
      toast({ title: 'Deleted selected', variant: 'default' });
      setSelectedNotifications([]);
      await refreshNotifications();
    } catch {
      toast({ title: 'Error deleting', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Mark all read
  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const typeMeta = (n: any) => {
    switch (n.type) {
      case 'team_invite': return { icon: <Users className="h-4 w-4" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
      case 'team_invite_response': return { icon: <Users className="h-4 w-4" />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
      case 'team_announcement': return { icon: <Bell className="h-4 w-4" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
      case 'staff_invite': return { icon: <Users className="h-4 w-4" />, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' };
      case 'result_reported': return { icon: <Info className="h-4 w-4" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
      case 'result_disputed': return { icon: <ShieldAlert className="h-4 w-4" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
      case 'result_accepted': return { icon: <CheckCheck className="h-4 w-4" />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
      case 'dispute_filed': return { icon: <ShieldAlert className="h-4 w-4" />, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
      case 'dispute_resolved': return { icon: <CheckCheck className="h-4 w-4" />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
      case 'dispute_rejected': return { icon: <ShieldAlert className="h-4 w-4" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
      case 'tournament_announcement': return { icon: <Bell className="h-4 w-4" />, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' };
      case 'ban': return { icon: <ShieldAlert className="h-4 w-4" />, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' };
      case 'kick': return { icon: <ShieldAlert className="h-4 w-4" />, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' };
      default: return { icon: <Info className="h-4 w-4" />, color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' };
    }
  };

  const filtered = useMemo(() => {
    const result = notifications.filter(n => !optimisticIds.includes(n.id));
    if (filter === 'unread') return result.filter(n => !n.is_read);
    if (filter === 'invites') return result.filter(n => n.type === 'team_invite');
    if (filter === 'system') return result.filter(n => n.type !== 'team_invite');
    return result;
  }, [notifications, filter, optimisticIds]);

  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="container mx-auto px-4 py-8 max-w-3xl">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-heading font-semibold text-white">
              Notifications
            </h1>
            <p className="text-zinc-500 mt-0.5 text-sm">Stay updated with your latest activities</p>
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
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border",
                filter === t.id
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  : "bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300 hover:border-white/10"
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
                className="flex flex-col items-center justify-center py-20 border border-white/5 rounded-xl bg-[#0a0a0c]"
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
                      "group relative overflow-hidden rounded-xl border transition-all duration-200",
                      selectedNotifications.includes(n.id)
                        ? "bg-rose-500/5 border-rose-500/30"
                        : !n.is_read
                          ? "bg-[#0a0a0c] border-white/10"
                          : "bg-[#0a0a0c]/50 border-white/5 opacity-70 hover:opacity-100"
                    )}
                  >
                    {/* Selection Checkbox Overlay */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-black/80 to-transparent">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(n.id)}
                        onChange={() => toggleNotificationSelection(n.id)}
                        className="w-4 h-4 rounded border-white/20 bg-black/50 checked:bg-rose-500 checked:border-rose-500 transition-all cursor-pointer"
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
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          )}
                        </div>
                        <p className="text-white/50 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>

                        {/* Helper for Invites */}
                        {n.type === 'team_invite' && (
                          <div className="flex items-center gap-1 mt-2 text-rose-400 text-[10px] font-medium uppercase tracking-wider">
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
