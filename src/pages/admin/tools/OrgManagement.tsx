import { useState, useEffect } from "react";
import {
  Search,
  Building2,
  MoreVertical,
  RefreshCw,
  Eye,
  Pencil,
  ShieldCheck,
  Loader2,
  History,
  Trophy,
  Users,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { useAdminOrganizations, useAdminUpdateOrgQuota, adminKeys } from "@/hooks/useAdminQueries";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import EntityHistoryTimeline from '@/components/admin/EntityHistoryTimeline';
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandIconButton,
  CommandSection,
  CommandSegmentedButton,
  CommandToolbar,
} from '@/components/management/CommandSurface';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  owner_id: string;
  owner_name: string;
  owner_avatar: string | null;
  subscription_tier: string;
  is_verified: boolean;
  monthly_event_quota: number | null;
  effective_quota: number;
  used_this_month: number;
  tournament_count: number;
  staff_count: number;
  created_at: string;
}

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const TIER_COLORS: Record<string, string> = {
  free: 'bg-zinc-700 text-zinc-300',
  basic: 'bg-blue-900/50 text-blue-300',
  pro: 'bg-purple-900/50 text-purple-300',
  enterprise: 'bg-amber-900/50 text-amber-300',
};

const PAGE_SIZE = 20;

export default function OrgManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Filters
  const [tierFilter, setTierFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [customQuotaFilter, setCustomQuotaFilter] = useState("all");

  // Sort
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(0);

  // Dialogs
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [quotaEditOrg, setQuotaEditOrg] = useState<Organization | null>(null);
  const [quotaInput, setQuotaInput] = useState("");
  const [historyOrg, setHistoryOrg] = useState<Organization | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Query
  const { data, isLoading, isFetching } = useAdminOrganizations({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search: searchTerm || undefined,
    subscription_tier: tierFilter !== "all" ? tierFilter : undefined,
    is_verified: verifiedFilter !== "all" ? verifiedFilter : undefined,
    has_custom_quota: customQuotaFilter !== "all" ? customQuotaFilter : undefined,
    sort_by: sortBy,
    sort_dir: sortDir,
  });

  const quotaMutation = useAdminUpdateOrgQuota();

  const organizations = data?.organizations ?? [];
  const total = data?.total ?? 0;
  const tierCounts = data?.tierCounts ?? {};
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Stats computed from response
  const verifiedCount = organizations.filter(o => o.is_verified).length;
  const customQuotaCount = organizations.filter(o => o.monthly_event_quota !== null).length;
  const atQuotaCount = organizations.filter(o => o.used_this_month >= o.effective_quota).length;

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
    setPage(0);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.organizations() });
  };

  const handleQuotaSubmit = () => {
    if (!quotaEditOrg) return;
    const val = parseInt(quotaInput, 10);
    if (isNaN(val) || val < 1) {
      toast({ title: "Invalid quota", description: "Monthly limit must be at least 1.", variant: "destructive" });
      return;
    }
    quotaMutation.mutate(
      { id: quotaEditOrg.id, monthlyLimit: val },
      {
        onSuccess: () => {
          setQuotaEditOrg(null);
          setQuotaInput("");
          // Also refresh detail if open
          if (selectedOrg?.id === quotaEditOrg.id) {
            queryClient.invalidateQueries({ queryKey: adminKeys.organizationDetail(quotaEditOrg.id) });
          }
        },
      }
    );
  };

  const openQuotaEdit = (org: Organization) => {
    setQuotaEditOrg(org);
    setQuotaInput(String(org.effective_quota));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortDir === "asc" ? <SortAsc className="inline w-3 h-3 ml-1" /> : <SortDesc className="inline w-3 h-3 ml-1" />;
  };

  return (
    <>
      <AdminPage
        eyebrow="Content"
        title="Organizations"
        description="Manage organizations, quotas, and verification status."
        actions={
          <CommandIconButton onClick={handleRefresh} disabled={isFetching} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </CommandIconButton>
        }
      >
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Organizations", value: total },
            { label: "Verified", value: verifiedCount },
            { label: "Custom Quota", value: customQuotaCount },
            { label: "At/Over Quota", value: atQuotaCount },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-black/30 border border-white/5 px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{stat.label}</div>
              <div className="text-xl font-semibold text-white">{isLoading ? "—" : stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <CommandToolbar>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search orgs or owners..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-md pl-9 pr-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
            />
          </div>
          <div className="flex items-center gap-1">
            {["all", "free", "basic", "pro", "enterprise"].map((t) => (
              <CommandSegmentedButton
                key={t}
                active={tierFilter === t}
                onClick={() => { setTierFilter(t); setPage(0); }}
              >
                {t === "all" ? "All" : TIER_LABELS[t] ?? t}
                {t !== "all" && tierCounts[t] ? ` (${tierCounts[t]})` : ""}
              </CommandSegmentedButton>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {[
              { value: "all", label: "All" },
              { value: "true", label: "Verified" },
              { value: "false", label: "Unverified" },
            ].map((opt) => (
              <CommandSegmentedButton
                key={opt.value}
                active={verifiedFilter === opt.value}
                onClick={() => { setVerifiedFilter(opt.value); setPage(0); }}
              >
                {opt.label}
              </CommandSegmentedButton>
            ))}
          </div>
        </CommandToolbar>

        {/* Table */}
        <CommandSection>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-black/40 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="text-left px-4 py-2">Organization</th>
                  <th className="text-left px-4 py-2">Owner</th>
                  <th className="text-left px-4 py-2">Tier</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">
                    <span className="cursor-pointer select-none" onClick={() => handleSort("tournament_count")}>
                      Quota <SortIcon column="tournament_count" />
                    </span>
                  </th>
                  <th className="text-left px-4 py-2">Tournaments</th>
                  <th className="text-left px-4 py-2">
                    <span className="cursor-pointer select-none" onClick={() => handleSort("created_at")}>
                      Created <SortIcon column="created_at" />
                    </span>
                  </th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-zinc-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading organizations...
                    </td>
                  </tr>
                ) : organizations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-zinc-500">
                      No organizations found.
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => (
                    <tr key={org.id} className="transition-colors hover:bg-white/[0.03]">
                      {/* Organization */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {org.logo_url ? (
                            <img src={org.logo_url} alt="" className="w-8 h-8 rounded-md object-cover bg-black/40" />
                          ) : (
                            <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-zinc-500" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-white">{org.name}</div>
                            <div className="text-xs text-zinc-500">{org.slug}</div>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {org.owner_avatar ? (
                            <img src={org.owner_avatar} alt="" className="w-5 h-5 rounded-full" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-zinc-700" />
                          )}
                          <span className="text-sm text-zinc-300">{org.owner_name ?? "—"}</span>
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${TIER_COLORS[org.subscription_tier] ?? 'bg-zinc-700 text-zinc-300'}`}>
                          {TIER_LABELS[org.subscription_tier] ?? org.subscription_tier}
                        </span>
                      </td>

                      {/* Verified */}
                      <td className="px-4 py-3">
                        {org.is_verified ? (
                          <Badge variant="default" className="bg-emerald-900/50 text-emerald-300 border-emerald-800 text-[10px]">
                            <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                          </Badge>
                        ) : (
                          <span className="text-xs text-zinc-600">Unverified</span>
                        )}
                      </td>

                      {/* Quota */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-mono ${org.used_this_month >= org.effective_quota ? 'text-red-400' : 'text-zinc-300'}`}>
                            {org.used_this_month}/{org.effective_quota}
                          </span>
                          {org.monthly_event_quota !== null && (
                            <span className="text-[10px] text-amber-500 font-medium">CUSTOM</span>
                          )}
                        </div>
                      </td>

                      {/* Tournaments */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-zinc-300">{org.tournament_count}</span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-500">
                          {new Date(org.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-white/10 transition-colors">
                              <MoreVertical className="w-4 h-4 text-zinc-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                            <DropdownMenuItem onClick={() => setSelectedOrg(org)} className="text-zinc-300 focus:text-white focus:bg-white/10">
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openQuotaEdit(org)} className="text-zinc-300 focus:text-white focus:bg-white/10">
                              <Pencil className="w-4 h-4 mr-2" /> Set Quota
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setHistoryOrg(org)} className="text-zinc-300 focus:text-white focus:bg-white/10">
                              <History className="w-4 h-4 mr-2" /> Audit History
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CommandSection>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-zinc-500">
            <span>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <CommandButton
                variant="secondary"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </CommandButton>
              <CommandButton
                variant="secondary"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </CommandButton>
            </div>
          </div>
        )}
      </AdminPage>

      {/* ── Detail Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!selectedOrg} onOpenChange={(open) => { if (!open) setSelectedOrg(null); }}>
        <DialogContent className="bg-zinc-900 border-white/10 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedOrg?.logo_url ? (
                <img src={selectedOrg.logo_url} alt="" className="w-10 h-10 rounded-md object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-zinc-800 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-zinc-500" />
                </div>
              )}
              <div>
                <div className="text-white">{selectedOrg?.name}</div>
                <div className="text-xs text-zinc-500 font-normal">{selectedOrg?.slug}</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedOrg && (
            <div className="space-y-6 mt-4">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Owner</div>
                  <div className="flex items-center gap-2">
                    {selectedOrg.owner_avatar ? (
                      <img src={selectedOrg.owner_avatar} alt="" className="w-5 h-5 rounded-full" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-zinc-700" />
                    )}
                    <span className="text-sm text-zinc-300">{selectedOrg.owner_name}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Tier</div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${TIER_COLORS[selectedOrg.subscription_tier] ?? 'bg-zinc-700 text-zinc-300'}`}>
                    {TIER_LABELS[selectedOrg.subscription_tier] ?? selectedOrg.subscription_tier}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Verified</div>
                  {selectedOrg.is_verified ? (
                    <Badge variant="default" className="bg-emerald-900/50 text-emerald-300 border-emerald-800 text-[10px]">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                    </Badge>
                  ) : (
                    <span className="text-xs text-zinc-500">Unverified</span>
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Created</div>
                  <span className="text-sm text-zinc-300">{new Date(selectedOrg.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Tournaments</div>
                  <span className="text-sm text-zinc-300 flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> {selectedOrg.tournament_count}</span>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Staff</div>
                  <span className="text-sm text-zinc-300 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {selectedOrg.staff_count}</span>
                </div>
              </div>

              {/* Quota Section */}
              <div className="rounded-lg bg-black/30 border border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Event Quota</div>
                  <CommandButton variant="secondary" size="sm" onClick={() => openQuotaEdit(selectedOrg)}>
                    <Pencil className="w-3 h-3 mr-1" /> Edit Quota
                  </CommandButton>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-zinc-500">Used This Month</div>
                    <div className={`text-lg font-mono font-semibold ${selectedOrg.used_this_month >= selectedOrg.effective_quota ? 'text-red-400' : 'text-white'}`}>
                      {selectedOrg.used_this_month}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Monthly Limit</div>
                    <div className="text-lg font-mono font-semibold text-white">
                      {selectedOrg.effective_quota}
                      {selectedOrg.monthly_event_quota !== null && (
                        <span className="text-[10px] text-amber-500 font-medium ml-2">CUSTOM</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Status</div>
                    <div className={`text-sm font-medium ${selectedOrg.used_this_month >= selectedOrg.effective_quota ? 'text-red-400' : 'text-emerald-400'}`}>
                      {selectedOrg.used_this_month >= selectedOrg.effective_quota ? 'At Limit' : 'Available'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit History */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Recent Activity</div>
                <EntityHistoryTimeline targetType="Organization" targetId={selectedOrg.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Quota Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!quotaEditOrg} onOpenChange={(open) => { if (!open) { setQuotaEditOrg(null); setQuotaInput(""); } }}>
        <DialogContent className="bg-zinc-900 border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>Set Monthly Event Quota</DialogTitle>
          </DialogHeader>
          {quotaEditOrg && (
            <div className="space-y-4 mt-2">
              <div className="text-sm text-zinc-400">
                Set the monthly published event limit for <span className="text-white font-medium">{quotaEditOrg.name}</span>.
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-lg bg-black/30 border border-white/5 p-3">
                <div>
                  <div className="text-xs text-zinc-500">Current Limit</div>
                  <div className="text-sm font-mono text-white">{quotaEditOrg.effective_quota}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Used This Month</div>
                  <div className="text-sm font-mono text-white">{quotaEditOrg.used_this_month}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">New Monthly Limit</label>
                <Input
                  type="number"
                  min={1}
                  value={quotaInput}
                  onChange={(e) => setQuotaInput(e.target.value)}
                  className="bg-black/40 border-white/10 text-white"
                  placeholder="e.g. 5"
                />
              </div>

              {parseInt(quotaInput, 10) < quotaEditOrg.used_this_month && parseInt(quotaInput, 10) >= 1 && (
                <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-800/30 rounded-md px-3 py-2">
                  This org has already used {quotaEditOrg.used_this_month} events this month. Lowering the limit won't unpublish existing events, but they won't be able to publish more until the quota resets.
                </div>
              )}
            </div>
          )}
          <DialogFooter className="mt-4">
            <CommandButton variant="secondary" onClick={() => { setQuotaEditOrg(null); setQuotaInput(""); }}>
              Cancel
            </CommandButton>
            <CommandButton
              variant="primary"
              onClick={handleQuotaSubmit}
              disabled={quotaMutation.isPending || !quotaInput || parseInt(quotaInput, 10) < 1}
            >
              {quotaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Update Quota
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Audit History Dialog ──────────────────────────────────────── */}
      <Dialog open={!!historyOrg} onOpenChange={(open) => { if (!open) setHistoryOrg(null); }}>
        <DialogContent className="bg-zinc-900 border-white/10 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit History — {historyOrg?.name}</DialogTitle>
          </DialogHeader>
          {historyOrg && (
            <div className="mt-4">
              <EntityHistoryTimeline targetType="Organization" targetId={historyOrg.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
