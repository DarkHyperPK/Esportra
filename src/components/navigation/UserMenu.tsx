import { Link, useNavigate } from "react-router-dom";
import { User, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/lib/supabase";
import RoleSwitcher from "@/components/RoleSwitcher";
import IdentitySwitcher from "@/components/IdentitySwitcher";

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

  const menuItemClass = "w-full rounded-2xl px-4 py-2.5 text-sm text-white transition focus:bg-white/5 focus:text-white hover:bg-white/5 flex items-center";
  const menuItemWithBadgeClass = "w-full rounded-2xl px-4 py-2.5 text-sm text-white transition focus:bg-white/5 focus:text-white hover:bg-white/5 flex items-center justify-between";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-white hover:bg-white/10 hover:text-white"
        >
          <User className="mr-2 h-4 w-4" />
          {profile?.username || 'Account'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[100] w-[320px] overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(6,8,16,0.96)] p-0 text-white shadow-[0_35px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
      >
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
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <IdentitySwitcher />
            </div>
          </div>
        )}

        <div className="px-3 py-3 space-y-1.5">
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/user/dashboard" className="w-full">Dashboard</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/auth/profile" className="w-full">Profile</Link>
          </DropdownMenuItem>
          {!admin.isAdmin && (
            <DropdownMenuItem asChild className={menuItemClass}>
              <Link to="/verification" className="w-full">Verification Status</Link>
            </DropdownMenuItem>
          )}
          {hasTeam ? (
            <DropdownMenuItem asChild className={menuItemClass}>
              <Link to="/player/teams" className="flex w-full items-center gap-2">
                <Users className="h-4 w-4 text-white/70 flex-shrink-0" />
                <span>My Team</span>
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild className={menuItemWithBadgeClass}>
              <Link to="/player/teams" className="flex w-full items-center gap-2">
                <span>Create Your Team</span>
                {hasPendingInvite && (
                  <span aria-label="pending invites" className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                )}
              </Link>
            </DropdownMenuItem>
          )}
          {hasStaffInvites && (
            <DropdownMenuItem asChild className={menuItemWithBadgeClass}>
              <Link to="/user/staff-invites" className="flex w-full items-center gap-2">
                <span>Staff Invites</span>
                <span aria-label="pending staff invites" className="h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0" />
              </Link>
            </DropdownMenuItem>
          )}
          {hasStaffAssignments && (
            <DropdownMenuItem asChild className={menuItemWithBadgeClass}>
              <Link to="/staff" className="flex w-full items-center gap-2">
                <span>Staff Console</span>
                <span aria-label="active staff role" className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/user/raise-dispute" className="flex w-full items-center gap-2">
              <MessageSquare className="h-4 w-4 text-white/70 flex-shrink-0" />
              <span>Raise a Dispute / Support</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/user/my-disputes" className="flex w-full items-center gap-2">
              <MessageSquare className="h-4 w-4 text-white/70 flex-shrink-0" />
              <span>My Disputes</span>
            </Link>
          </DropdownMenuItem>
        </div>

        <div className="border-t border-white/10 px-3 py-3 space-y-1.5">
          {admin.isAdmin && admin.roles.includes('super_admin') && (
            <>
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link to="/organizer/tournaments" className="w-full">Manage Tournaments</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link to="/tournaments/create" className="w-full">Create Tournament</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link to="/venue-owner/dashboard" className="w-full">Manage Venues</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link to="/venues/list-venue" className="w-full">List New Venue</Link>
              </DropdownMenuItem>
            </>
          )}

          {!admin.isAdmin && userRole === 'venue_owner' && (
            <DropdownMenuItem asChild className={menuItemClass}>
              <Link to="/venues/list-venue" className="w-full">List New Venue</Link>
            </DropdownMenuItem>
          )}
          {!admin.isAdmin && userRole === 'organizer' && (
            <>
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link to="/organizer/tournaments" className="w-full">Manage Tournaments</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link to="/tournaments/create" className="w-full">Create Tournament</Link>
              </DropdownMenuItem>
            </>
          )}

          {admin.isAdmin && (
            <>
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link to="/admin/dashboard" className="w-full">Admin Dashboard</Link>
              </DropdownMenuItem>
              {admin.hasPermission('admin:assign_roles') && (
                <DropdownMenuItem asChild className={menuItemClass}>
                  <Link to="/admin/access" className="w-full">Admin Access</Link>
                </DropdownMenuItem>
              )}
              {admin.hasPermission('verification:review') && (
                <DropdownMenuItem asChild className={menuItemClass}>
                  <Link to="/admin/verification" className="w-full">Verification Queue</Link>
                </DropdownMenuItem>
              )}
              {admin.hasPermission('dispute:resolve') && (
                <DropdownMenuItem asChild className={menuItemClass}>
                  <Link to="/admin/disputes" className="w-full">Dispute Center</Link>
                </DropdownMenuItem>
              )}
              {admin.hasPermission('settings:update') && (
                <DropdownMenuItem asChild className={menuItemClass}>
                  <Link to="/admin/settings" className="w-full">System Settings</Link>
                </DropdownMenuItem>
              )}
              {admin.hasPermission('audit:view') && (
                <DropdownMenuItem asChild className={menuItemClass}>
                  <Link to="/admin/audit" className="w-full">Activity Logs</Link>
                </DropdownMenuItem>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
