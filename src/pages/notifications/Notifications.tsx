import React, { useMemo, useState } from 'react';
import { useNotifications } from '@/components/NotificationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Check, X, MoreVertical, CheckCheck, Bell, Inbox, ShieldAlert, Users as UsersIcon, Info } from 'lucide-react';
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

  // Accept team invite
  const handleAcceptInvite = async (notification) => {
    try {
      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      if (profile?.is_admin) {
        toast({ 
          title: 'Cannot join team', 
          description: 'Admins cannot join teams as members. You can only create and manage teams.',
          variant: 'destructive' 
        });
        return;
      }

      const { data: invite, error: inviteErr } = await supabase
        .from('team_invites')
        .select('*')
        .eq('user_id', notification.user_id)
        .eq('team_id', notification.team_id)
        .eq('status', 'pending')
        .maybeSingle();
      if (inviteErr) throw inviteErr;
      if (!invite) { toast({ title: 'Invite not found', variant: 'destructive' }); return; }

      // Add user as active member
      const { error: addErr } = await supabase.from('team_members').insert({
        team_id: invite.team_id,
        user_id: invite.user_id,
        role: 'member',
        is_active: true,
        joined_at: new Date().toISOString(),
      });
      if (addErr && addErr.code !== '23505') throw addErr; // ignore unique violation if already a member

      // Update invite status
      const { error: updErr } = await supabase
        .from('team_invites')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', invite.id);
      if (updErr) throw updErr;

      // Mark read if this came from a stored notification
      if (notification.id && !String(notification.id).startsWith('invite-')) {
        await markAsRead(notification.id);
      }

      // Notify inviter
      await supabase.from('notifications').insert({
        user_id: invite.invited_by,
        type: 'team_invite_response',
        title: 'Team Invite Accepted',
        message: 'An invited player accepted your team invite.',
        team_id: invite.team_id,
        is_read: false,
        created_at: new Date().toISOString(),
      });

      toast({ title: 'Invite accepted', description: 'You have joined the team!', variant: 'default' });
      await refreshNotifications();
      
      // Dispatch custom event to refresh team data
      window.dispatchEvent(new CustomEvent('teamInviteAccepted'));
    } catch (e: any) {
      console.error('Accept invite error', e);
      toast({ title: 'Could not accept invite', description: e.message || 'Please try again', variant: 'destructive' });
    }
  };

  // Reject team invite
  const handleRejectInvite = async (notification) => {
    try {
      const { data: invite, error: inviteErr } = await supabase
        .from('team_invites')
        .select('*')
        .eq('user_id', notification.user_id)
        .eq('team_id', notification.team_id)
        .eq('status', 'pending')
        .maybeSingle();
      if (inviteErr) throw inviteErr;
      if (!invite) { toast({ title: 'Invite not found', variant: 'destructive' }); return; }

      const { error: updErr } = await supabase
        .from('team_invites')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', invite.id);
      if (updErr) throw updErr;

      if (notification.id && !String(notification.id).startsWith('invite-')) {
        await markAsRead(notification.id);
      }

      await supabase.from('notifications').insert({
        user_id: invite.invited_by,
        type: 'team_invite_response',
        title: 'Team Invite Rejected',
        message: 'An invited player rejected your team invite.',
        team_id: invite.team_id,
        is_read: false,
        created_at: new Date().toISOString(),
      });

      toast({ title: 'Invite rejected', description: 'You have rejected the team invite.', variant: 'default' });
      await refreshNotifications();
    } catch (e: any) {
      console.error('Reject invite error', e);
      toast({ title: 'Could not reject invite', description: e.message || 'Please try again', variant: 'destructive' });
    }
  };

  // Delete single notification
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      setIsDeleting(true);
      
      // Check if it's a synthetic notification (team invite)
      if (String(notificationId).startsWith('invite-')) {
        // For team invites, we need to delete from team_invites table
        const inviteId = notificationId.replace('invite-', '');
        const { error } = await supabase
          .from('team_invites')
          .delete()
          .eq('id', inviteId);
        
        if (error) throw error;
      } else {
        // For regular notifications, delete from notifications table
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId);
        
        if (error) throw error;
      }

      toast({ 
        title: 'Notification deleted', 
        description: 'The notification has been removed.',
        variant: 'default' 
      });
      
      await refreshNotifications();
    } catch (error) {
      console.error('Delete notification error:', error);
      toast({ 
        title: 'Could not delete notification', 
        description: 'Please try again later.',
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete multiple notifications
  const handleBulkDelete = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      setIsDeleting(true);
      
      // Separate synthetic and regular notifications
      const syntheticIds = selectedNotifications.filter(id => String(id).startsWith('invite-'));
      const regularIds = selectedNotifications.filter(id => !String(id).startsWith('invite-'));
      
      // Delete synthetic notifications (team invites)
      if (syntheticIds.length > 0) {
        const inviteIds = syntheticIds.map(id => id.replace('invite-', ''));
        const { error: inviteError } = await supabase
          .from('team_invites')
          .delete()
          .in('id', inviteIds);
        
        if (inviteError) throw inviteError;
      }
      
      // Delete regular notifications
      if (regularIds.length > 0) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .delete()
          .in('id', regularIds);
        
        if (notificationError) throw notificationError;
      }

      toast({ 
        title: 'Notifications deleted', 
        description: `${selectedNotifications.length} notification(s) have been removed.`,
        variant: 'default' 
      });
      
      setSelectedNotifications([]);
      await refreshNotifications();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({ 
        title: 'Could not delete notifications', 
        description: 'Please try again later.',
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      const regularIds = unreadNotifications
        .filter(n => !String(n.id).startsWith('invite-'))
        .map(n => n.id);
      
      if (regularIds.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', regularIds);
        
        if (error) throw error;
      }

      toast({ 
        title: 'All marked as read', 
        description: 'All notifications have been marked as read.',
        variant: 'default' 
      });
      
      await refreshNotifications();
    } catch (error) {
      console.error('Mark all read error:', error);
      toast({ 
        title: 'Could not mark as read', 
        description: 'Please try again later.',
        variant: 'destructive' 
      });
    }
  };

  // Toggle notification selection
  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId) 
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  // Select all notifications
  const selectAllNotifications = () => {
    setSelectedNotifications(notifications.map(n => n.id));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedNotifications([]);
  };

  const typeMeta = (n: any) => {
    switch (n.type) {
      case 'team_invite':
        return { icon: <UsersIcon className="h-4 w-4" />, label: 'Invite', pill: 'bg-blue-600' };
      case 'ban':
        return { icon: <ShieldAlert className="h-4 w-4" />, label: 'Ban', pill: 'bg-red-600' };
      case 'kick':
        return { icon: <ShieldAlert className="h-4 w-4" />, label: 'Kicked', pill: 'bg-orange-600' };
      case 'team_invite_response':
        return { icon: <UsersIcon className="h-4 w-4" />, label: 'Invite Update', pill: 'bg-green-600' };
      default:
        return { icon: <Info className="h-4 w-4" />, label: 'System', pill: 'bg-gray-600' };
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => !n.is_read);
    if (filter === 'invites') return notifications.filter(n => n.type === 'team_invite');
    if (filter === 'system') return notifications.filter(n => n.type !== 'team_invite');
    return notifications;
  }, [notifications, filter]);

  return (
    <div className="min-h-screen bg-esports-dark text-white py-10">
      <div className="container mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gaming-purple/20 border border-gaming-purple/40 flex items-center justify-center">
              <Bell className="h-5 w-5 text-gaming-purple" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-5">Notification Center</h1>
              <div className="text-xs text-gray-400">Invites and system updates</div>
            </div>
          </div>
          {notifications.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-6">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'invites', label: 'Invites' },
            { id: 'system', label: 'System' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id as any)}
              className={`px-3 py-1.5 rounded-md text-sm border ${filter === t.id ? 'bg-gaming-purple/20 border-gaming-purple text-white' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}`}
            >
              {t.label}
            </button>
          ))}
          {filtered.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectedNotifications.length === filtered.length ? clearSelection : selectAllNotifications}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                {selectedNotifications.length === filtered.length ? 'Deselect All' : 'Select All'}
              </Button>
              {selectedNotifications.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedNotifications.length})
                </Button>
              )}
            </div>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <Inbox className="mx-auto mb-3 h-8 w-8 text-gray-600" />
            Nothing here yet
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((n) => (
              <Card
                key={n.id}
                className={`transition border-gaming-gray/30 ${
                  selectedNotifications.includes(n.id) 
                    ? 'border-blue-500 shadow-lg bg-blue-500/10' 
                    : !n.is_read 
                      ? 'border-gaming-purple/60 shadow-lg bg-gaming-purple/10' 
                      : 'bg-gaming-dark'
                }`}
              >
                <CardContent className="flex flex-col md:flex-row md:items-center gap-3 p-4">
                  {/* Selection checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(n.id)}
                      onChange={() => toggleNotificationSelection(n.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>
                  
                  {/* Main content */}
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={async () => {
                      setSelected(n);
                      if (!n.is_read) await markAsRead(n.id);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${n.is_read ? 'bg-gray-700' : 'bg-gaming-purple/30'}`}>
                        {typeMeta(n).icon}
                      </div>
                      <span className="font-semibold text-base">{n.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeMeta(n).pill} text-white`}>{typeMeta(n).label}</span>
                    </div>
                    <div className="text-gray-300 text-sm mb-1 line-clamp-2">{n.message}</div>
                    {n.type === 'team_invite' && !n.is_read && (
                          <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={e => { e.stopPropagation(); handleAcceptInvite(n); }} className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-sm hover:shadow ring-1 ring-green-400/20">
                          Accept Invite
                        </Button>
                        <Button size="sm" onClick={e => { e.stopPropagation(); handleRejectInvite(n); }} className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm hover:shadow ring-1 ring-red-400/20">
                          Reject
                        </Button>
                          </div>
                        )}
                    {n.reason && (
                      <div className="text-xs text-gaming-purple/80 mt-1">Reason: {n.reason}</div>
                    )}
                  </div>
                  
                  {/* Right side actions */}
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500 min-w-[120px] text-right">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {n.link && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={e => { e.stopPropagation(); navigate(n.link!); }}
                          className="border-gray-600 text-white hover:bg-gray-700"
                        >
                          View
                        </Button>
                      )}
                      {!n.is_read && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={async e => { e.stopPropagation(); await markAsRead(n.id); }}
                          className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                        >
                          Mark Read
                        </Button>
                      )}
                      
                      {/* More actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={e => e.stopPropagation()}
                            className="text-gray-400 hover:text-white hover:bg-gray-700"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-600">
                          <DropdownMenuItem
                            onClick={e => { e.stopPropagation(); handleDeleteNotification(n.id); }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Notification Details Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>{new Date(selected.created_at).toLocaleString()}</DialogDescription>
              </DialogHeader>
              <div className="mt-2 text-gray-200">{selected.message}</div>
              {selected.reason && (
                <div className="mt-2 text-gaming-purple/80">Reason: {selected.reason}</div>
              )}
              {selected.link && (
                <Button className="mt-4 w-full bg-gaming-purple hover:bg-gaming-purple/80 text-white" onClick={() => navigate(selected.link!)}>
                  Go to Tournament
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-gray-800 border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Notifications</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to delete {selectedNotifications.length} notification(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
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
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationsPage; 