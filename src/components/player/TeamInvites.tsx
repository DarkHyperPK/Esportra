import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { useTeamManagement, TeamInvite } from '@/hooks/useTeamManagement';
import { CheckCircle, XCircle, Clock, Users, Bell } from "lucide-react";

const TeamInvites = () => {
  const { teamInvites, invitesLoading, acceptTeamInvite, declineTeamInvite } = useTeamManagement();

  if (invitesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 border border-rose-500/20">
            <Bell className="h-5 w-5 text-rose-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">Team Invites</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-white/10 rounded mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (teamInvites.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 border border-rose-500/20">
            <Bell className="h-5 w-5 text-rose-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">Team Invites</h3>
        </div>
        <div className="bg-[#0a0a0c] border border-white/10 p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <Users className="h-10 w-10 text-white" />
          </div>
          <h4 className="text-xl font-bold text-white mb-2">No Pending Invites</h4>
          <p className="text-gray-400 max-w-md mx-auto">
            You don't have any pending team invitations at the moment. 
            When teams invite you, they'll appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-rose-500/10 border border-rose-500/20">
          <Bell className="h-5 w-5 text-rose-400" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">Team Invites</h3>
          <p className="text-gray-400">You have {teamInvites.length} pending invitation{teamInvites.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teamInvites.map((invite: TeamInvite) => (
          <div key={invite.id} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/25 group">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/20 flex items-center justify-center overflow-hidden">
                  {invite.team.logo_url ? (
                    <img src={invite.team.logo_url} loading="lazy" alt={invite.team.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="h-8 w-8 text-purple-400" />
                  )}
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Clock className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-white mb-1">{invite.team.name}</h4>
                <div className="flex items-center gap-2">
                  <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs">
                    {invite.team.game}
                  </Badge>
                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10 text-xs">
                    Pending
                  </Badge>
                </div>
              </div>
            </div>

            {/* Inviter Info */}
            <div className="flex items-center gap-3 mb-4 p-3 backdrop-blur-xl bg-white/5 rounded-xl border border-white/10">
              <Avatar className="h-8 w-8" src={invite.inviter.avatar_url} name={invite.inviter.username} />
              <div>
                <div className="text-sm font-medium text-white">
                  Invited by {invite.inviter.username}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(invite.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Message */}
            {invite.message && (
              <div className="mb-4 p-3 backdrop-blur-xl bg-white/5 rounded-xl border border-white/10">
                <div className="text-sm text-gray-300">{invite.message}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => acceptTeamInvite(invite.id)}
                className="flex-1 bg-white text-black hover:bg-white/90 font-mono text-xs font-bold uppercase tracking-wider transition-all"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button
                onClick={() => declineTeamInvite(invite.id)}
                variant="outline"
                className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20 backdrop-blur-xl rounded-xl"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamInvites; 
