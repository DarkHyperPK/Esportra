// OrganizerDashboard.tsx
// This file is the main dashboard for the organizer (stats, quick links, etc.)
import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Calendar, BarChart3, Plus, Building2, ChevronRight, ShieldCheck, Workflow } from "lucide-react";
import { apiClient } from '@/lib/apiClient';
import TournamentsList from "@/components/organizer/TournamentsList";
import ParticipantsList from "@/components/organizer/ParticipantsList";
import TournamentSchedule from "@/components/organizer/TournamentSchedule";
import TournamentAnalytics from "@/components/organizer/TournamentAnalytics";
import TournamentHistory from "@/components/organizer/TournamentHistory";
import OrganizationSettings from "@/pages/organizer/OrganizationSettings";
import OrganizationStaffManager from "@/components/organizer/OrganizationStaffManager";
import { Button } from "@/components/ui/button";

import { useOrganizerStats } from "@/hooks/useOrganizerStats";

const OrganizerDashboard = () => {
  const { profile, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTabState] = useState(tabFromUrl || "tournaments");
  const navigate = useNavigate();

  // Sync tab changes to the URL so refresh preserves the active section
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setSearchParams({ tab }, { replace: true });
  };
  const { data: stats, isLoading: statsLoading } = useOrganizerStats();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [orgLogo, setOrgLogo] = useState<string | null>(null);

  // Fetch organization for staff management
  useEffect(() => {
    if (!user?.id) return;

    const fetchOrg = async () => {
      // 1. Try to find an org where user is owner
      const ownerData = await apiClient.get<any>(`/api/organizations/me`).catch(() => null);

      if (ownerData) {
        setOrgId(ownerData.id);
        setOrgName(ownerData.name || "");
        setOrgLogo(ownerData.logo_url || null);
        return;
      }

      // 2. If not owner, check if they are active staff
      const staffData = await apiClient.get<any>(`/api/organizations/my-staff`).catch(() => null);

      if (staffData && staffData.organizations) {
        const org = Array.isArray(staffData.organizations) ? staffData.organizations[0] : staffData.organizations;
        setOrgId(org.id);
        setOrgName(org.name || "");
        setOrgLogo(org.logo_url || null);
      }
    };

    fetchOrg();
  }, [user?.id]);

  // Update activeTab when URL query changes
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleCreateTournament = () => {
    navigate('/tournaments/create');
  };


  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-rose-500/30">
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      </div>

      <div className="relative z-10 flex-grow container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-[1px] bg-rose-500" />
              <span className="text-rose-500 font-mono text-xs tracking-widest uppercase">ORGANIZER_PANEL</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Organization Dashboard</h1>
            <p className="text-zinc-500 mt-1">Welcome back, {profile?.full_name || profile?.username}</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/organizer/seasons')}
              variant="outline"
              className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 text-white"
            >
              <Workflow className="mr-2 h-4 w-4" />
              Manage Seasons
            </Button>
            <Button
              onClick={() => navigate('/organizer/tournaments')}
              variant="outline"
              className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 text-white"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Manage Tournaments
            </Button>
            <Button
              onClick={() => navigate('/tournaments/create')}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 p-5">
              <h2 className="text-sm font-bold tracking-widest text-zinc-400 uppercase mb-4">Management</h2>
              <div className="space-y-1">

                <button
                  onClick={() => setActiveTab("tournaments")}
                  className={cn(
                    "flex items-center w-full px-4 py-3 text-left rounded-xl transition-all duration-200 group",
                    activeTab === "tournaments"
                      ? "bg-rose-500/10 text-white border border-rose-500/30"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent"
                  )}
                >
                  <Trophy className={cn("mr-3 h-4 w-4", activeTab === "tournaments" ? "text-rose-500" : "text-zinc-500 group-hover:text-rose-500")} />
                  <span className="text-sm font-medium">My Tournaments</span>
                  <ChevronRight className={cn("ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "tournaments" && "opacity-100 text-rose-500")} />
                </button>

                <button
                  onClick={() => setActiveTab("participants")}
                  className={cn(
                    "flex items-center w-full px-4 py-3 text-left rounded-xl transition-all duration-200 group",
                    activeTab === "participants"
                      ? "bg-rose-500/10 text-white border border-rose-500/30"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent"
                  )}
                >
                  <Users className={cn("mr-3 h-4 w-4", activeTab === "participants" ? "text-rose-500" : "text-zinc-500 group-hover:text-rose-500")} />
                  <span className="text-sm font-medium">Participants</span>
                  <ChevronRight className={cn("ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "participants" && "opacity-100 text-rose-500")} />
                </button>

                <button
                  onClick={() => setActiveTab("schedule")}
                  className={cn(
                    "flex items-center w-full px-4 py-3 text-left rounded-xl transition-all duration-200 group",
                    activeTab === "schedule"
                      ? "bg-rose-500/10 text-white border border-rose-500/30"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent"
                  )}
                >
                  <Calendar className={cn("mr-3 h-4 w-4", activeTab === "schedule" ? "text-rose-500" : "text-zinc-500 group-hover:text-rose-500")} />
                  <span className="text-sm font-medium">Schedule</span>
                  <ChevronRight className={cn("ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "schedule" && "opacity-100 text-rose-500")} />
                </button>

                <button
                  onClick={() => setActiveTab("analytics")}
                  className={cn(
                    "flex items-center w-full px-4 py-3 text-left rounded-xl transition-all duration-200 group",
                    activeTab === "analytics"
                      ? "bg-rose-500/10 text-white border border-rose-500/30"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent"
                  )}
                >
                  <BarChart3 className={cn("mr-3 h-4 w-4", activeTab === "analytics" ? "text-rose-500" : "text-zinc-500 group-hover:text-rose-500")} />
                  <span className="text-sm font-medium">Analytics</span>
                  <ChevronRight className={cn("ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "analytics" && "opacity-100 text-rose-500")} />
                </button>

                <button
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "flex items-center w-full px-4 py-3 text-left rounded-xl transition-all duration-200 group",
                    activeTab === "history"
                      ? "bg-rose-500/10 text-white border border-rose-500/30"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent"
                  )}
                >
                  <Trophy className={cn("mr-3 h-4 w-4", activeTab === "history" ? "text-rose-500" : "text-zinc-500 group-hover:text-rose-500")} />
                  <span className="text-sm font-medium">Tournament History</span>
                  <ChevronRight className={cn("ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "history" && "opacity-100 text-rose-500")} />
                </button>

                <button
                  onClick={() => setActiveTab("organization")}
                  className={cn(
                    "flex items-center w-full px-4 py-3 text-left rounded-xl transition-all duration-200 group",
                    activeTab === "organization"
                      ? "bg-rose-500/10 text-white border border-rose-500/30"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent"
                  )}
                >
                  <Building2 className={cn("mr-3 h-4 w-4", activeTab === "organization" ? "text-rose-500" : "text-zinc-500 group-hover:text-rose-500")} />
                  <span className="text-sm font-medium">My Organization</span>
                  <ChevronRight className={cn("ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "organization" && "opacity-100 text-rose-500")} />
                </button>

                <button
                  onClick={() => setActiveTab("staff")}
                  className={cn(
                    "flex items-center w-full px-4 py-3 text-left rounded-xl transition-all duration-200 group",
                    activeTab === "staff"
                      ? "bg-rose-500/10 text-white border border-rose-500/30"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent"
                  )}
                >
                  <ShieldCheck className={cn("mr-3 h-4 w-4", activeTab === "staff" ? "text-rose-500" : "text-zinc-500 group-hover:text-rose-500")} />
                  <span className="text-sm font-medium">Staff</span>
                  <ChevronRight className={cn("ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "staff" && "opacity-100 text-rose-500")} />
                </button>
              </div>

            </div>

          </div>


          {/* Main content area */}
          <div className="lg:col-span-4">
            <TabsContent value="tournaments" className="m-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-6 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 hover:border-rose-500/30 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">Active</span>
                    <div className="p-2 rounded-lg bg-zinc-900/50 group-hover:bg-rose-500/10 transition-colors">
                      <Trophy className="w-4 h-4 text-rose-500" />
                    </div>
                  </div>
                  <div className="text-4xl font-black text-white">
                    {statsLoading ? "..." : (stats?.activeTournaments || 0)}
                  </div>
                  <p className="text-zinc-500 text-sm mt-1">Currently running</p>
                </div>

                <div className="p-6 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 hover:border-rose-500/30 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">Upcoming</span>
                    <div className="p-2 rounded-lg bg-zinc-900/50 group-hover:bg-rose-500/10 transition-colors">
                      <Calendar className="w-4 h-4 text-rose-500" />
                    </div>
                  </div>
                  <div className="text-4xl font-black text-white">
                    {statsLoading ? "..." : (stats?.upcomingTournaments || 0)}
                  </div>
                  <p className="text-zinc-500 text-sm mt-1">Next 30 days</p>
                </div>

                <div className="p-6 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 hover:border-rose-500/30 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">Participants</span>
                    <div className="p-2 rounded-lg bg-zinc-900/50 group-hover:bg-rose-500/10 transition-colors">
                      <Users className="w-4 h-4 text-rose-500" />
                    </div>
                  </div>
                  <div className="text-4xl font-black text-white">
                    {statsLoading ? "..." : (stats?.totalParticipants || 0)}
                  </div>
                  <p className="text-zinc-500 text-sm mt-1">Across all tournaments</p>
                </div>
              </div>

              <TournamentsList />
            </TabsContent>

            <TabsContent value="participants" className="m-0">
              <ParticipantsList />
            </TabsContent>

            <TabsContent value="schedule" className="m-0">
              <TournamentSchedule />
            </TabsContent>

            <TabsContent value="analytics" className="m-0">
              <TournamentAnalytics />
            </TabsContent>

            <TabsContent value="history" className="m-0">
              <TournamentHistory />
            </TabsContent>

            <TabsContent value="organization" className="m-0">
              <OrganizationSettings />
            </TabsContent>

            <TabsContent value="staff" className="m-0">
              {orgId && user?.id ? (
                <OrganizationStaffManager
                  organizationId={orgId}
                  ownerId={user.id}
                  orgName={orgName}
                  orgLogo={orgLogo}
                  ownerName={profile?.full_name || profile?.username || "An Organizer"}
                />
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                  <p>Create an organization first to manage staff.</p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default OrganizerDashboard;
