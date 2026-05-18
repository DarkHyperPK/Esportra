import { useNavigate } from "react-router-dom";
import { User, Users, MessageSquare, ArrowRightLeft, Building2, Award, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FramerDropdownRoot,
  FramerDropdownContent,
  FramerDropdownItem,
  FramerDropdownTrigger,
  FramerDropdownSeparator,
  useFramerDropdown
} from "@/components/ui/FramerDropdown";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
import { apiClient } from "@/lib/apiClient";
import { deriveHasApprovedLicense, deriveHasOrganization, fetchMeRoles } from "@/lib/meRoles";
import RoleSwitcher, { RoleSwitcherDialog } from "@/components/RoleSwitcher";
import { AlertTriangle } from "lucide-react";

// Specialized button component for inside the menu
const RoleSwitcherMenuButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { currentRole } = useRole();
  const { close } = useFramerDropdown();

  const getRoleLabel = (role: string) => {
    if (role === 'casual') return 'Player';
    if (role === 'organizer') return 'Organizer';
    if (role === 'venue_owner') return 'Venue Owner';
    if (role === 'admin') return 'Admin';
    return String(role);
  };

  return (
    <div className="flex items-center gap-3">
      <Badge
        variant="secondary"
        className={`bg-gradient-to-r from-cyan-500/70 to-sky-500/70 border border-cyan-400/30 text-white flex items-center gap-2`}
      >
        {getRoleLabel(currentRole)}
      </Badge>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onClick();
          close();
        }}
        className="rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"
      >
        <ArrowRightLeft className="w-4 h-4 mr-2" />
        Switch Role
      </Button>
    </div>
  );
};

const UserMenu = ({
  handleSignOut
}: {
  handleSignOut: () => Promise<void>;
}) => {
  const { user, profile, isEmailVerified } = useAuth();
  const { currentRole: userRole } = useRole();
  const admin = useAdmin();
  const navigate = useNavigate();
  const [hasTeam, setHasTeam] = useState(false);
  const [hasPendingInvite, setHasPendingInvite] = useState(false);
  const [hasStaffInvites, setHasStaffInvites] = useState(false);
  const [hasStaffAssignments, setHasStaffAssignments] = useState(false);
  const [hasOrganization, setHasOrganization] = useState(false);

  // Track if user has any approved license (for role switcher visibility)
  const [hasApprovedLicense, setHasApprovedLicense] = useState(false);

  // State for Role Switcher Dialog (Lifted up so it persists after menu close)
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);

  // Check if organizer has an organization
  const checkOrganization = useCallback(async () => {
    if (!user?.id || userRole !== 'organizer') {
      setHasOrganization(false);
      return;
    }
    try {
      const roles = await fetchMeRoles();
      setHasOrganization(deriveHasOrganization(roles));
    } catch {
      setHasOrganization(false);
    }
  }, [user?.id, userRole]);

  useEffect(() => {
    checkOrganization();
    // Listen for organization created event
    const handleOrgCreated = () => checkOrganization();
    window.addEventListener('organizationCreated', handleOrgCreated);
    return () => window.removeEventListener('organizationCreated', handleOrgCreated);
  }, [checkOrganization]);

  // Check if user has any approved licenses (organizer or venue_owner)
  useEffect(() => {
    const checkApprovedLicenses = async () => {
      if (!user?.id) {
        setHasApprovedLicense(false);
        return;
      }
      try {
        const roles = await fetchMeRoles();
        setHasApprovedLicense(deriveHasApprovedLicense(roles));
      } catch {
        setHasApprovedLicense(false);
      }
    };
    checkApprovedLicenses();
  }, [user?.id]);


  const checkTeamStatus = useCallback(async () => {
    if (!user) { setHasTeam(false); return; }
    try {
      const teams = await apiClient.get<any[]>('/api/teams/me');
      setHasTeam(!!(teams && teams.length > 0));
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
        const invites = await apiClient.get<any[]>('/api/teams/me/invites');
        setHasPendingInvite(!!(invites && invites.length > 0));
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
        const invites = await apiClient.get<any[]>('/api/organizations/staff/invites');
        setHasStaffInvites(!!(invites && invites.length > 0));
        const assignments = await apiClient.get<any[]>('/api/organizations/staff/assignments');
        setHasStaffAssignments(!!(assignments && assignments.length > 0));
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
    <>
      <FramerDropdownRoot>
        <FramerDropdownTrigger>
          <Button
            variant="outline"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-white hover:bg-white/10 hover:text-white"
          >
            <User className="mr-2 h-4 w-4" />
            {profile?.username || 'Account'}
            {!isEmailVerified && user && (
              <AlertTriangle className="ml-1.5 h-3.5 w-3.5 text-amber-400" />
            )}
          </Button>
        </FramerDropdownTrigger>
        <FramerDropdownContent align="end" width={320}>
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-sm font-semibold text-white">
              {profile?.full_name || profile?.username || 'User'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">{roleLabel}</p>
              {!isEmailVerified && user && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-400 uppercase tracking-wider">
                  Unverified
                </Badge>
              )}
            </div>
          </div>

          {!admin.isAdmin && hasApprovedLicense && (
            <div className="space-y-2 border-b border-white/10 px-4 py-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <RoleSwitcherMenuButton onClick={() => setIsRoleSwitcherOpen(true)} />
              </div>
            </div>
          )}

          <div className="px-1 py-1 space-y-0.5">
            <FramerDropdownItem to="/user/profile">My Profile</FramerDropdownItem>
            <FramerDropdownItem to="/account/settings" icon={<Settings className="h-4 w-4" />}>
              Account Settings
            </FramerDropdownItem>
            {!admin.isAdmin && (
              <FramerDropdownItem to="/verification" icon={<Award className="h-4 w-4" />}>
                Apply for License
              </FramerDropdownItem>
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
              <FramerDropdownItem to="/staff/dashboard">
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
            {admin.isAdmin && (
              <>
                <FramerDropdownItem to="/admin/dashboard">
                  Admin Dashboard
                </FramerDropdownItem>
              </>
            )}

            {admin.isAdmin && admin.hasPermission('tournaments:create') && (
              <>
                <FramerDropdownItem to="/organizer/tournaments">Manage Tournaments</FramerDropdownItem>
                <FramerDropdownItem to="/tournaments/create">Create Tournament</FramerDropdownItem>
              </>
            )}

            {admin.isAdmin && admin.hasPermission('venues:view') && (
              <>
                <FramerDropdownItem to="/venues/dashboard">Venue Dashboard</FramerDropdownItem>
                <FramerDropdownItem to="/venues/list-venue">List New Venue</FramerDropdownItem>
              </>
            )}

            {!admin.isAdmin && userRole === 'venue_owner' && (
              <>
                <FramerDropdownItem to="/venues/dashboard">Venue Dashboard</FramerDropdownItem>
                <FramerDropdownItem to="/venues/list-venue">List New Venue</FramerDropdownItem>
              </>
            )}
            {!admin.isAdmin && userRole === 'organizer' && (
              <>
                {hasOrganization ? (
                  <>
                    <FramerDropdownItem to="/organizer/tournaments">Manage Tournaments</FramerDropdownItem>
                    <FramerDropdownItem to="/organizer/dashboard?tab=organization" icon={<Building2 className="h-4 w-4" />}>
                      Manage Organization
                    </FramerDropdownItem>
                    <FramerDropdownItem to="/tournaments/create">Create Tournament</FramerDropdownItem>
                    <FramerDropdownItem to="/seasons/create">Create Season</FramerDropdownItem>
                  </>
                ) : (
                  <FramerDropdownItem to="/organizer/setup-organization" icon={<Building2 className="h-4 w-4" />}>
                    <div className="flex w-full items-center justify-between">
                      <span>Setup Organization</span>
                      <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                    </div>
                  </FramerDropdownItem>
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

      {/* Role Switcher Dialog - Rendered here to survive menu close */}
      <RoleSwitcherDialog open={isRoleSwitcherOpen} onOpenChange={setIsRoleSwitcherOpen} />
    </>
  );
};

export default UserMenu;
