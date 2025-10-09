import React, { useState } from 'react';
import { useNotifications } from '@/components/NotificationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const NotificationsPage = () => {
  const { notifications, markAsRead, refreshNotifications } = useNotifications();
  const [selected, setSelected] = useState<null | typeof notifications[0]>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Accept team invite
  const handleAcceptInvite = async (notification) => {
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

      // Add user as active member
      const { error: addErr } = await supabase.from('team_members').insert({
        team_id: invite.team_id,
        user_id: invite.user_id,
        role: 'player',
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

  return (
    <div className="min-h-screen bg-esports-dark text-white py-10">
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Notifications</h1>
        {notifications.length === 0 ? (
          <div className="text-center text-gray-400">No notifications yet.</div>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={`transition border-gaming-gray/30 ${!n.is_read ? 'border-gaming-purple/60 shadow-lg bg-gaming-purple/10' : 'bg-gaming-dark'}`}
                onClick={async () => {
                  setSelected(n);
                  if (!n.is_read) await markAsRead(n.id);
                }}
                role="button"
              >
                <CardContent className="flex flex-col md:flex-row md:items-center gap-2 p-4 cursor-pointer">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.is_read && <span className="w-2 h-2 bg-gaming-purple rounded-full" />}
                      <span className="font-semibold text-lg">{n.title}</span>
                      <Badge variant={n.type === 'ban' ? 'destructive' : n.type === 'kick' ? 'secondary' : n.type === 'team_invite' ? 'default' : 'default'}>
                        {n.type === 'team_invite' ? 'Team Invite' : n.type.charAt(0).toUpperCase() + n.type.slice(1)}
                      </Badge>
                    </div>
                    <div className="text-gray-300 text-sm mb-1 line-clamp-2">{n.message}</div>
                    {n.type === 'team_invite' && !n.is_read && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="success" onClick={e => { e.stopPropagation(); handleAcceptInvite(n); }}>
                          Accept Invite
                        </Button>
                        <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); handleRejectInvite(n); }}>
                          Reject
                        </Button>
                      </div>
                    )}
                    {n.reason && (
                      <div className="text-xs text-gaming-purple/80 mt-1">Reason: {n.reason}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 min-w-[120px] text-right">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                  {n.link && (
                    <Button size="sm" variant="outline" className="ml-2" onClick={e => { e.stopPropagation(); navigate(n.link!); }}>
                      View
                    </Button>
                  )}
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
                <Button className="mt-4 w-full" onClick={() => navigate(selected.link!)}>
                  Go to Tournament
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationsPage; 