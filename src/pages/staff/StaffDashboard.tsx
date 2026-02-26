// StaffDashboard.tsx — Dedicated dashboard for organization staff members
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { ProfileLoading } from "@/components/profile/ProfileLoading";
import {
  Shield, Trophy, Building2, ChevronRight,
  Clock, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface StaffOrg {
  id: string;
  organization_id: string;
  role: string;
  permissions: string[];
  status: string;
  created_at: string;
  accepted_at: string | null;
  organization: {
    id: string;
    name: string;
    slug: string | null;
    logo_url: string | null;
  };
}

interface AssignedTournament {
  id: string;
  tournament_id: string;
  tournament: {
    id: string;
    name: string;
    status: string;
    slug: string;
  };
}

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  admin: { label: "Administrator", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  moderator: { label: "Moderator", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  "co-host": { label: "Co-Host", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
};

const PERMISSION_LABELS: Record<string, string> = {
  "scores:update": "Update Scores",
  "teams:manage": "Manage Teams",
  "bracket:edit": "Edit Brackets",
  "announcements:send": "Send Announcements",
  "disputes:assist": "Assist Disputes",
};

const StaffDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staffOrgs, setStaffOrgs] = useState<StaffOrg[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<StaffOrg | null>(null);
  const [tournaments, setTournaments] = useState<AssignedTournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);

  // Load all orgs this user staffs
  const loadStaffOrgs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organization_staff")
        .select(`
                    id, organization_id, role, permissions, status, created_at, accepted_at,
                    organization:organization_id(id, name, slug, logo_url)
                `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("accepted_at", { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map((d: any) => ({
        ...d,
        organization: Array.isArray(d.organization) ? d.organization[0] : d.organization,
      }));
      setStaffOrgs(mapped as StaffOrg[]);
      if (mapped.length > 0) setSelectedOrg(mapped[0] as StaffOrg);
    } catch (err: any) {
      toast({ title: "Failed to load staff data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Load assigned tournaments for selected org
  const loadTournaments = useCallback(async () => {
    if (!selectedOrg || !user) return;
    setTournamentsLoading(true);
    try {
      if (selectedOrg.role === "admin") {
        // Admins see ALL org tournaments
        const { data, error } = await supabase
          .from("tournaments")
          .select("id, name, status, slug")
          .eq("organization_id", selectedOrg.organization_id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTournaments((data || []).map((t: any) => ({
          id: `admin-${t.id}`,
          tournament_id: t.id,
          tournament: t,
        })));
      } else {
        // Mods/Co-Hosts see only assigned tournaments
        const { data, error } = await supabase
          .from("staff_tournament_assignments")
          .select(`
                        id, tournament_id,
                        tournament:tournament_id(id, name, status, slug)
                    `)
          .eq("organization_staff_id", selectedOrg.id);

        if (error) throw error;
        const mapped = (data || []).map((d: any) => ({
          ...d,
          tournament: Array.isArray(d.tournament) ? d.tournament[0] : d.tournament,
        }));
        setTournaments(mapped as AssignedTournament[]);
      }
    } catch (err: any) {
      console.error("Failed to load tournaments:", err);
    } finally {
      setTournamentsLoading(false);
    }
  }, [selectedOrg, user]);

  useEffect(() => { loadStaffOrgs(); }, [loadStaffOrgs]);
  useEffect(() => { loadTournaments(); }, [loadTournaments]);

  if (loading) return <ProfileLoading />;

  if (staffOrgs.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <Shield className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
          <h2 className="text-2xl font-bold mb-2">No Active Staff Roles</h2>
          <p className="text-zinc-500 text-sm mb-6">
            You don't currently have any active staff positions. When an organization invites you,
            you'll be able to manage tournaments from here.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const roleBadge = ROLE_BADGES[selectedOrg?.role || ""] || { label: selectedOrg?.role, color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30" };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-amber-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
        <div className="absolute top-[-30%] right-[-20%] w-[50vw] h-[50vw] bg-amber-600/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/5 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 flex-grow container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-[1px] bg-amber-500" />
              <span className="text-amber-500 font-mono text-xs tracking-widest uppercase">STAFF_PANEL</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Staff Dashboard</h1>
            <p className="text-zinc-500 mt-1">Manage your assigned tournaments and responsibilities</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sidebar — Org Selector */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 p-5">
              <h2 className="text-sm font-bold tracking-widest text-zinc-400 uppercase mb-4">Organizations</h2>
              <div className="space-y-1">
                {staffOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => setSelectedOrg(org)}
                    className={cn(
                      "flex items-center w-full px-4 py-3 text-left rounded-xl transition-all duration-200 group",
                      selectedOrg?.id === org.id
                        ? "bg-amber-500/10 text-white border border-amber-500/30"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent"
                    )}
                  >
                    {org.organization?.logo_url ? (
                      <img
                        src={org.organization.logo_url}
                        alt=""
                        className="w-5 h-5 rounded mr-3 object-cover"
                      />
                    ) : (
                      <Building2 className={cn("mr-3 h-4 w-4", selectedOrg?.id === org.id ? "text-amber-500" : "text-zinc-500")} />
                    )}
                    <span className="text-sm font-medium truncate">{org.organization?.name || "Organization"}</span>
                    <ChevronRight className={cn("ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity", selectedOrg?.id === org.id && "opacity-100 text-amber-500")} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-4 space-y-6">
            {selectedOrg && (
              <>
                {/* Role & Permissions Card */}
                <div className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-amber-500" />
                      <h3 className="text-lg font-bold">Your Role</h3>
                    </div>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-semibold border", roleBadge.color)}>
                      {roleBadge.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedOrg.permissions.map((perm) => (
                      <div
                        key={perm}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 text-xs text-zinc-300"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        {PERMISSION_LABELS[perm] || perm}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-[11px] text-zinc-600 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Joined {selectedOrg.accepted_at ? formatDistanceToNow(new Date(selectedOrg.accepted_at), { addSuffix: true }) : "recently"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {selectedOrg.organization?.name}
                    </span>
                  </div>
                </div>

                {/* Assigned Tournaments */}
                <div className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <h3 className="text-lg font-bold">
                      {selectedOrg.role === "admin" ? "All Tournaments" : "Assigned Tournaments"}
                    </h3>
                    <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">
                      {tournaments.length}
                    </span>
                  </div>

                  {tournamentsLoading ? (
                    <div className="text-center py-8 text-zinc-600">Loading tournaments...</div>
                  ) : tournaments.length === 0 ? (
                    <div className="text-center py-8 text-zinc-600">
                      <Trophy className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No tournaments assigned yet</p>
                      <p className="text-xs text-zinc-700 mt-1">Your organization admin will assign tournaments to you</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {tournaments.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => t.tournament?.slug && navigate(`/organizer/tournament/${t.tournament.slug}`)}
                          className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Trophy className="h-4 w-4 text-zinc-600 group-hover:text-amber-500 transition-colors" />
                            <div>
                              <p className="text-sm font-medium text-white group-hover:text-amber-100">
                                {t.tournament?.name || "Tournament"}
                              </p>
                              <p className="text-[11px] text-zinc-600 font-mono uppercase">
                                {t.tournament?.status || "unknown"}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-amber-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
