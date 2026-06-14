import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronRight,
  Plus,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";
import { useOrganizerStats } from "@/hooks/useOrganizerStats";
import TournamentsList from "@/components/organizer/TournamentsList";
import ParticipantsList from "@/components/organizer/ParticipantsList";
import TournamentSchedule from "@/components/organizer/TournamentSchedule";
import TournamentAnalytics from "@/components/organizer/TournamentAnalytics";
import TournamentHistory from "@/components/organizer/TournamentHistory";
import OrganizationSettings from "@/pages/organizer/OrganizationSettings";
import OrganizationStaffManager from "@/components/organizer/OrganizationStaffManager";
import {
  CommandButton,
  CommandEmptyState,
  CommandHeader,
  CommandMetric,
  CommandPageGrid,
  CommandRail,
  CommandSection,
  CommandShell,
} from "@/components/management/CommandSurface";

const managementTabs = [
  { value: "tournaments", label: "Tournaments", icon: Trophy },
  { value: "participants", label: "Participants", icon: Users },
  { value: "schedule", label: "Schedule", icon: Calendar },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
  { value: "history", label: "History", icon: Trophy },
  { value: "organization", label: "Organization", icon: Building2 },
  { value: "staff", label: "Staff", icon: ShieldCheck },
];

const tabTitles: Record<string, { eyebrow: string; title: string; description: string }> = {
  tournaments: {
    eyebrow: "Tournament Ops",
    title: "Hosted Tournaments",
    description: "Operate every event your organization owns from one command surface.",
  },
  participants: {
    eyebrow: "Roster Ops",
    title: "Participants",
    description: "Review teams, captains, registrations, reminders, and eligibility signals.",
  },
  schedule: {
    eyebrow: "Match Ops",
    title: "Schedule",
    description: "Track upcoming match windows and tournament activity by date.",
  },
  analytics: {
    eyebrow: "Performance",
    title: "Analytics",
    description: "Monitor participation, prize pools, game mix, and event momentum.",
  },
  history: {
    eyebrow: "Archive",
    title: "History",
    description: "Inspect past, active, and upcoming tournaments with operational context.",
  },
  organization: {
    eyebrow: "Organization",
    title: "Manage Organization",
    description: "Edit profile, branding, media, staff, and advanced organization controls.",
  },
  staff: {
    eyebrow: "Access",
    title: "Staff",
    description: "Manage organization staff access and operational permissions.",
  },
};

const staffScheduleTabs = new Set(["schedule", "history"]);

const OrganizerDashboard = () => {
  const { profile, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOrgOwner, setIsOrgOwner] = useState(false);
  const [isOrgStaff, setIsOrgStaff] = useState(false);
  const staffOnlyView = isOrgStaff && !isOrgOwner && profile?.role !== "organizer";
  const visibleTabs = staffOnlyView
    ? managementTabs.filter((tab) => staffScheduleTabs.has(tab.value))
    : managementTabs;
  const tabFromUrl = searchParams.get("tab");
  const defaultTab = staffOnlyView
    ? "schedule"
    : location.pathname.includes("/settings") || location.pathname.includes("/organization")
      ? tabFromUrl || "organization"
      : tabFromUrl || "tournaments";
  const [activeTab, setActiveTabState] = useState(defaultTab);
  const { data: stats, isLoading: statsLoading } = useOrganizerStats();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgLogo, setOrgLogo] = useState<string | null>(null);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setSearchParams({ tab }, { replace: true });
  };

  useEffect(() => {
    if (!tabFromUrl) return;
    if (staffOnlyView && !staffScheduleTabs.has(tabFromUrl)) {
      setActiveTabState("schedule");
      setSearchParams({ tab: "schedule" }, { replace: true });
      return;
    }
    if (tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl);
    }
  }, [activeTab, tabFromUrl, staffOnlyView, setSearchParams]);

  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;
    const fetchOrg = async () => {
      const mine = await apiClient.get<any>("/api/organizations/mine").catch(() => null);
      const fallback = mine?.id ? mine : await apiClient.get<any>("/api/organizations/me").catch(() => null);
      const staffData = await apiClient.get<any[]>("/api/organizations/staff/assignments").catch(() => []);
      const activeStaff = (staffData || []).filter((row) => row.status === "active");
      const staffOrg = activeStaff[0]?.organization;
      const resolvedStaffOrg = Array.isArray(staffOrg) ? staffOrg[0] : staffOrg;
      const org = fallback?.id ? fallback : resolvedStaffOrg;

      if (!mounted) return;
      setIsOrgOwner(Boolean(fallback?.id));
      setIsOrgStaff(activeStaff.length > 0);

      if (!org?.id) return;
      setOrgId(org.id);
      setOrgName(org.name || "");
      setOrgLogo(org.logo_url || null);
    };

    void fetchOrg();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const activeMeta = tabTitles[activeTab] || tabTitles.tournaments;
  const ownerName = profile?.full_name || profile?.username || "Organizer";

  const metrics = useMemo(
    () => [
      {
        label: "Active",
        value: statsLoading ? "..." : stats?.activeTournaments || 0,
        icon: <Trophy className="h-4 w-4" />,
      },
      {
        label: "Upcoming",
        value: statsLoading ? "..." : stats?.upcomingTournaments || 0,
        icon: <Calendar className="h-4 w-4" />,
      },
      {
        label: "Participants",
        value: statsLoading ? "..." : stats?.totalParticipants || 0,
        icon: <Users className="h-4 w-4" />,
      },
    ],
    [stats, statsLoading],
  );

  return (
    <CommandShell>
      <CommandPageGrid
        rail={
          <CommandRail className="lg:sticky lg:top-24">
            <div className="relative z-20 flex items-center gap-3 pb-4">
              <div className="flex h-10 w-10 items-center justify-center border border-white/10 bg-black">
                {orgLogo ? <img src={orgLogo} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5 text-rose-400" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{orgName || "Organization"}</p>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">{ownerName}</p>
              </div>
            </div>

            <div className="relative z-20 border-t border-white/10 pt-4">
              <p className="mb-3 px-1 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400">Manage</p>
              <div role="navigation" aria-label="Organizer management" className="grid gap-2">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveTab(tab.value)}
                      className={cn(
                        "relative z-20 flex h-10 w-full items-center gap-3 border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/70",
                        active
                          ? "border-transparent bg-rose-500 text-white"
                          : "border-white/15 bg-black text-zinc-200 hover:border-white/25 hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-zinc-400")} />
                      <span className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-wide">{tab.label}</span>
                      <ChevronRight className={cn("h-4 w-4 shrink-0 transition-opacity", active ? "text-white opacity-100" : "text-zinc-500 opacity-0")} />
                    </button>
                  );
                })}
              </div>
            </div>
          </CommandRail>
        }
      >
        <CommandHeader
          eyebrow={activeMeta.eyebrow}
          title={activeMeta.title}
          description={activeMeta.description}
          actions={
            staffOnlyView ? undefined : (
              <>
                <CommandButton variant="secondary" onClick={() => navigate("/organizer/tournaments")}>
                  <Trophy className="h-4 w-4" />
                  Tournaments
                </CommandButton>
                <CommandButton slide onClick={() => navigate("/tournaments/create")}>
                  <Plus className="h-4 w-4" />
                  Create Tournament
                </CommandButton>
              </>
            )
          }
        />

        {!staffOnlyView && (
          <div className="grid grid-cols-3 gap-3">
            {metrics.map((metric) => (
              <CommandMetric key={metric.label} label={metric.label} value={metric.value} icon={metric.icon} />
            ))}
          </div>
        )}

        {activeTab === "tournaments" && <TournamentsList />}
        {activeTab === "participants" && <ParticipantsList />}
        {activeTab === "schedule" && <TournamentSchedule />}
        {activeTab === "analytics" && <TournamentAnalytics />}
        {activeTab === "history" && <TournamentHistory />}
        {activeTab === "organization" && <OrganizationSettings />}
        {activeTab === "staff" && (
          <CommandSection>
            {orgId && user?.id ? (
              <OrganizationStaffManager
                organizationId={orgId}
                ownerId={user.id}
                orgName={orgName}
                orgLogo={orgLogo}
                ownerName={ownerName}
              />
            ) : (
              <CommandEmptyState
                title="Organization required"
                description="Create or connect an organization before assigning staff access."
                icon={<ShieldCheck className="h-5 w-5" />}
              />
            )}
          </CommandSection>
        )}
      </CommandPageGrid>
      <Footer />
    </CommandShell>
  );
};

export default OrganizerDashboard;
