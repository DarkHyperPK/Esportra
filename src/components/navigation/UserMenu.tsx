import { useNavigate } from "react-router-dom";
import { User, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FramerDropdownRoot,
  FramerDropdownContent,
  FramerDropdownItem,
  FramerDropdownTrigger,
  FramerDropdownSeparator
} from "@/components/ui/FramerDropdown";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/lib/supabase";
import RoleSwitcher from "@/components/RoleSwitcher";


const UserMenu = ({
  handleSignOut
}: {
  handleSignOut: () => Promise<void>;
}) => {
  const { user, profile } = useAuth();
  const { currentRole: userRole } = useRole();
  const admin = useAdmin();
  const navigate = useNavigate();
  const [hasTeam, setHasTeam] = useState(false);
  const [hasPendingInvite, setHasPendingInvite] = useState(false);
  const [hasStaffInvites, setHasStaffInvites] = useState(false);
  const [hasStaffAssignments, setHasStaffAssignments] = useState(false);

  const checkTeamStatus = useCallback(async () => {
    if (!user) { setHasTeam(false); return; }
    try {
      const { data: created } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (created?.id) { setHasTeam(true); return; }
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();
      setHasTeam(!!membership?.team_id);
    } catch {
      setHasTeam(false);
    }
  }, [user]);

  useEffect(() => {
    checkTeamStatus();
  }, [checkTeamStatus]);

  // Check for pending team invitations for the current user (for badge indicator)
  useEffect(() => {
    const checkInvites = async () => {
      if (!user?.id) { setHasPendingInvite(false); return; }
      try {
        const { data } = await supabase
          .from('team_invitations')
          .select('id')
          .or(`invited_user_id.eq.${user.id},invited_email.eq.${user.email}`)
          .eq('status', 'pending')
          .limit(1);
        setHasPendingInvite(!!(data && data.length > 0));
      } catch {
        setHasPendingInvite(false);
      }
    };
    checkInvites();
  }, [user?.id, user?.email]);

  useEffect(() => {
    const checkStaffInvites = async () => {
      if (!user?.id) {
        setHasStaffInvites(false);
        setHasStaffAssignments(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('tournament_staff')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .limit(1);
        setHasStaffInvites(!!(data && data.length > 0));
        const { data: activeAssignments } = await supabase
          .from('tournament_staff')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);
        setHasStaffAssignments(!!(activeAssignments && activeAssignments.length > 0));
      } catch {
        setHasStaffInvites(false);
        setHasStaffAssignments(false);
      }
    };

    checkStaffInvites();
    const handle = () => checkStaffInvites();
    window.addEventListener('staffInviteUpdated', handle);
    return () => {
      window.removeEventListener('staffInviteUpdated', handle);
    };
  }, [user?.id]);

  // Listen for team changes (when user creates/joins/leaves a team)
  useEffect(() => {
    const handleTeamChange = () => {
      checkTeamStatus();
      // Clear the badge once user joins a team
      setHasPendingInvite(false);
    };

    // Listen for custom events that indicate team changes
    window.addEventListener('teamCreated', handleTeamChange);
    window.addEventListener('teamJoined', handleTeamChange);
    window.addEventListener('teamLeft', handleTeamChange);

    return () => {
      window.removeEventListener('teamCreated', handleTeamChange);
      window.removeEventListener('teamJoined', handleTeamChange);
      window.removeEventListener('teamLeft', handleTeamChange);
    };
  }, [checkTeamStatus]);

  const roleLabel = admin.isAdmin
    ? admin.roles.includes('super_admin')
      ? 'Super Admin'
      : admin.roles.length > 0
        ? admin.roles.map(r => r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')
        : 'Admin'
    : userRole.charAt(0).toUpperCase() + userRole.slice(1);



  return (
    <FramerDropdownRoot>
      <FramerDropdownTrigger>
        <Button
          variant="outline"
          className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-white hover:bg-white/10 hover:text-white"
        >
          <User className="mr-2 h-4 w-4" />
          {profile?.username || 'Account'}
        </Button>
      </FramerDropdownTrigger>
      <FramerDropdownContent align="end" width={320}>
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-sm font-semibold text-white">
            {profile?.full_name || profile?.username || 'User'}
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-white/50 mt-1">{roleLabel}</p>
        </div>

        {!admin.isAdmin && (
          <div className="space-y-2 border-b border-white/10 px-4 py-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <RoleSwitcher />
            </div>
          </div>
        )}

        <div className="px-1 py-1 space-y-0.5">
          <FramerDropdownItem to="/user/dashboard">Dashboard</FramerDropdownItem>
          <FramerDropdownItem to="/auth/profile">Profile</FramerDropdownItem>
          {!admin.isAdmin && (
            <FramerDropdownItem to="/verification">Verification Status</FramerDropdownItem>
          )}
          {hasTeam ? (
            <FramerDropdownItem to="/player/teams" icon={<Users className="h-4 w-4" />}>
              My Team
            </FramerDropdownItem>
          ) : (
            <FramerDropdownItem to="/player/teams">
              <div className="flex w-full items-center justify-between">
                <span>Create Your Team</span>
                {hasPendingInvite && (
                  <span aria-label="pending invites" className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                )}
              </div>
            </FramerDropdownItem>
          )}
          {hasStaffInvites && (
            <FramerDropdownItem to="/user/staff-invites">
              <div className="flex w-full items-center justify-between">
                <span>Staff Invites</span>
                <span aria-label="pending staff invites" className="h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0" />
              </div>
            </FramerDropdownItem>
          )}
          {hasStaffAssignments && (
            <FramerDropdownItem to="/staff">
              <div className="flex w-full items-center justify-between">
                <span>Staff Console</span>
                <span aria-label="active staff role" className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
              </div>
            </FramerDropdownItem>
          )}
          <FramerDropdownItem to="/user/raise-dispute" icon={<MessageSquare className="h-4 w-4" />}>
            Raise a Dispute / Support
          </FramerDropdownItem>
          <FramerDropdownItem to="/user/my-disputes" icon={<MessageSquare className="h-4 w-4" />}>
            My Disputes
          </FramerDropdownItem>
        </div>

        <FramerDropdownSeparator />

        <div className="px-1 py-1 space-y-0.5">
          {admin.isAdmin && admin.roles.includes('super_admin') && (
            <>
              <FramerDropdownItem to="/organizer/tournaments">Manage Tournaments</FramerDropdownItem>
              <FramerDropdownItem to="/tournaments/create">Create Tournament</FramerDropdownItem>
              <FramerDropdownItem to="/venue-owner/dashboard">Manage Venues</FramerDropdownItem>
              <FramerDropdownItem to="/venues/list-venue">List New Venue</FramerDropdownItem>
            </>
          )}

          {!admin.isAdmin && userRole === 'venue_owner' && (
            <FramerDropdownItem to="/venues/list-venue">List New Venue</FramerDropdownItem>
          )}
          {!admin.isAdmin && userRole === 'organizer' && (
            <>
              <FramerDropdownItem to="/organizer/tournaments">Manage Tournaments</FramerDropdownItem>
              <FramerDropdownItem to="/tournaments/create">Create Tournament</FramerDropdownItem>
            </>
          )}

          {admin.isAdmin && (
            <>
              <FramerDropdownItem to="/admin/dashboard">Admin Dashboard</FramerDropdownItem>
              {admin.hasPermission('admin:assign_roles') && (
                <FramerDropdownItem to="/admin/access">Admin Access</FramerDropdownItem>
              )}
              {admin.hasPermission('verification:review') && (
                <FramerDropdownItem to="/admin/verification">Verification Queue</FramerDropdownItem>
              )}
              {admin.hasPermission('dispute:resolve') && (
                <FramerDropdownItem to="/admin/disputes">Dispute Center</FramerDropdownItem>
              )}
              {admin.hasPermission('settings:update') && (
                <FramerDropdownItem to="/admin/settings">System Settings</FramerDropdownItem>
              )}
              {admin.hasPermission('audit:view') && (
                <FramerDropdownItem to="/admin/audit">Activity Logs</FramerDropdownItem>
              )}
            </>
          )}
        </div>

        <div className="border-t border-white/10 px-3 py-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
          >
            Sign Out
          </button>
        </div>
      </FramerDropdownContent>
    </FramerDropdownRoot>
  );
};

export default UserMenu;
