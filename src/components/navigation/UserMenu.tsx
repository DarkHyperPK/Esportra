import { ArrowRightLeft, ChevronDown, LogOut, User } from "lucide-react";
import {
  FramerDropdownRoot,
  FramerDropdownContent,
  FramerDropdownTrigger,
  useFramerDropdown,
} from "@/components/ui/FramerDropdown";
import { JackMenuItem, JackMenuDivider } from "@/components/ui/JackMenuItem";
import { JackButton } from "@/components/ui/JackButton";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useAdmin } from "@/hooks/useAdmin";
import { apiClient } from "@/lib/apiClient";
import { deriveHasApprovedLicense, deriveHasOrganization, fetchMeRoles } from "@/lib/meRoles";
import { RoleSwitcherDialog } from "@/components/RoleSwitcher";

// Pill row showing current role + a JACK IN-style switch button
const RoleSwitcherMenuButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { currentRole } = useRole();
  const { close } = useFramerDropdown();

  const getRoleLabel = (role: string) => {
    if (role === "casual") return "Player";
    if (role === "organizer") return "Organizer";
    if (role === "venue_owner") return "Venue Owner";
    if (role === "admin") return "Admin";
    return String(role);
  };

  return (
    <div className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.02] px-3 py-2">
      <div className="flex flex-col">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          Active role
        </span>
        <span className="mt-0.5 text-sm font-semibold text-white">{getRoleLabel(currentRole)}</span>
      </div>
      <JackButton
        size="sm"
        className="px-4"
        onClick={() => {
          onClick();
          close();
        }}
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Switch
      </JackButton>
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
  const [hasTeam, setHasTeam] = useState(false);
  const [hasPendingInvite, setHasPendingInvite] = useState(false);
  const [hasStaffInvites, setHasStaffInvites] = useState(false);
  const [hasStaffAssignments, setHasStaffAssignments] = useState(false);
  const [hasOrganization, setHasOrganization] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

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

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile?.avatar_url]);

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
  const avatarUrl = profile?.avatar_url?.trim() || "";
  const showAvatarImage = avatarUrl && !avatarFailed;
  const initials = (profile?.username || profile?.full_name || "User").slice(0, 2).toUpperCase();

  const dot = (color: "rose" | "cyan" | "amber" | "emerald") => {
    const cls =
      color === "rose"
        ? "bg-rose-500"
        : color === "cyan"
          ? "bg-cyan-400"
          : color === "amber"
            ? "bg-amber-400"
            : "bg-emerald-400";
    return <span className={`h-2 w-2 rounded-full ${cls} flex-shrink-0`} />;
  };

  return (
    <>
      <FramerDropdownRoot
        borderRadius={0}
        accentColor="#f43f5e"
        backgroundColor="#0a0a0c"
        borderColor="rgba(244,63,94,0.4)"
      >
        <FramerDropdownTrigger>
          <button
            type="button"
            className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-white/85 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-rose-500/70"
          >
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden border border-white/10 bg-[#0a0a0c]">
              {showAvatarImage ? (
                <img
                  src={avatarUrl}
                  alt={profile?.username || "Profile"}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                  onError={() => setAvatarFailed(true)}
                />
              ) : profile?.username ? (
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                  {initials}
                </span>
              ) : (
                <User className="h-4 w-4" />
              )}
            </span>
            <span className="hidden max-w-[100px] truncate sm:inline">
              {profile?.username || "Account"}
            </span>
            <ChevronDown className="h-4 w-4 opacity-60" />
            {!isEmailVerified && user && dot("amber")}
          </button>
        </FramerDropdownTrigger>

        <FramerDropdownContent
          align="end"
          width={280}
          className="!rounded-none !border-rose-500/40 !bg-[#0a0a0c] !p-0 !backdrop-blur-0"
        >
          {/* Identity header */}
          <div className="border-b border-white/10 bg-[#0a0a0c] px-4 py-4">
            <p className="text-sm font-semibold text-white">
              {profile?.full_name || profile?.username || "User"}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                {roleLabel}
              </p>
              {!isEmailVerified && user && (
                <span className="border border-amber-500/40 px-1.5 py-0 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-400">
                  Unverified
                </span>
              )}
            </div>
          </div>

          {!admin.isAdmin && hasApprovedLicense && (
            <div className="border-b border-white/10 bg-[#0a0a0c] p-3">
              <RoleSwitcherMenuButton onClick={() => setIsRoleSwitcherOpen(true)} />
            </div>
          )}

          <div className="space-y-px bg-[#0a0a0c] p-2">
            <JackMenuItem to="/user/profile">My Profile</JackMenuItem>
            <JackMenuItem to="/account/settings">Account Settings</JackMenuItem>
            {!admin.isAdmin && (
              <JackMenuItem to="/verification">Apply for License</JackMenuItem>
            )}

            {hasTeam ? (
              <JackMenuItem to="/player/teams">My Team</JackMenuItem>
            ) : (
              <JackMenuItem
                to="/player/teams"
                trailing={hasPendingInvite ? dot("rose") : undefined}
              >
                Create Your Team
              </JackMenuItem>
            )}

            {hasStaffInvites && (
              <JackMenuItem to="/user/staff-invites" trailing={dot("cyan")}>
                Staff Invites
              </JackMenuItem>
            )}
            {hasStaffAssignments && (
              <JackMenuItem to="/staff/dashboard" trailing={dot("emerald")}>
                Staff Console
              </JackMenuItem>
            )}

            <JackMenuItem to="/user/raise-dispute">Raise a Dispute</JackMenuItem>
            <JackMenuItem to="/user/my-disputes">My Disputes</JackMenuItem>

            {admin.isAdmin && (
              <>
                <JackMenuDivider />
                <JackMenuItem to="/admin/dashboard">Admin Dashboard</JackMenuItem>
                {admin.hasPermission("tournaments:create") && (
                  <>
                    <JackMenuItem to="/organizer/tournaments">Manage Tournaments</JackMenuItem>
                    <JackMenuItem to="/tournaments/create">Create Tournament</JackMenuItem>
                  </>
                )}
                {admin.hasPermission("venues:view") && (
                  <>
                    <JackMenuItem to="/venues/dashboard">Venue Dashboard</JackMenuItem>
                    <JackMenuItem to="/venues/list-venue">List New Venue</JackMenuItem>
                  </>
                )}
              </>
            )}

            {!admin.isAdmin && userRole === "venue_owner" && (
              <>
                <JackMenuDivider />
                <JackMenuItem to="/venues/dashboard">Venue Dashboard</JackMenuItem>
                <JackMenuItem to="/venues/list-venue">List New Venue</JackMenuItem>
              </>
            )}

            {!admin.isAdmin && userRole === "organizer" && (
              <>
                <JackMenuDivider />
                {hasOrganization ? (
                  <>
                    <JackMenuItem to="/organizer/tournaments">Manage Tournaments</JackMenuItem>
                    <JackMenuItem to="/organizer/dashboard?tab=organization">
                      Manage Organization
                    </JackMenuItem>
                    <JackMenuItem to="/tournaments/create">Create Tournament</JackMenuItem>
                  </>
                ) : (
                  <JackMenuItem to="/organizer/setup-organization" trailing={dot("amber")}>
                    Setup Organization
                  </JackMenuItem>
                )}
              </>
            )}
          </div>

          <div className="border-t border-white/10 bg-[#0a0a0c] p-3">
            <JackButton
              variant="invert"
              size="sm"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </JackButton>
          </div>
        </FramerDropdownContent>
      </FramerDropdownRoot>

      {/* Role Switcher Dialog - rendered here to survive menu close */}
      <RoleSwitcherDialog open={isRoleSwitcherOpen} onOpenChange={setIsRoleSwitcherOpen} />
    </>
  );
};

export default UserMenu;
