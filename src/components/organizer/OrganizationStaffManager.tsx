import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
    type StaffPermission,
    type OrganizationStaffRecord,
    type AuditLogEntry,
    type TournamentAssignment,
    fetchOrganizationStaff,
    inviteOrganizationStaff,
    updateOrganizationStaff,
    updateAssignmentPermissions,
    removeOrganizationStaff,
    assignStaffToTournaments,
    removeStaffFromTournament,
    fetchAuditLogs,
    fetchOrgTournaments,
    ALL_STAFF_PERMISSIONS,
} from "@/lib/organizationStaff";
import { StaffPermissionPicker, StaffPermissionChips } from "@/components/organizer/StaffPermissionPicker";
import { invalidateStaffAccessCaches } from "@/lib/tournamentAccess";
import {
    auditActionLabel,
    formatOrganizationAuditDetails,
    isTournamentOpsAudit,
    resolveOrganizationAuditLogLink,
    shouldShowOrganizationAuditDetailLine,
} from "@/utils/auditLogFormat";
import { formatDistanceToNow } from "date-fns";
import {
    ChevronDown,
    ChevronRight,
    ClipboardList,
    Crown,
    Filter,
    History,
    Loader2,
    Plus,
    Search,
    Shield,
    ShieldCheck,
    Trash2,
    Trophy,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Audit log filter options
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const AUDIT_ACTION_OPTIONS: { value: string; label: string }[] = [
    { value: "staff.invite", label: "Staff invited" },
    { value: "staff.accept", label: "Invite accepted" },
    { value: "staff.decline", label: "Invite declined" },
    { value: "staff.update_permissions", label: "Permissions updated" },
    { value: "staff.update_assignment_permissions", label: "Tournament permissions updated" },
    { value: "staff.assign_tournament", label: "Assigned to tournament" },
    { value: "staff.unassign_tournament", label: "Unassigned from tournament" },
    { value: "staff.remove", label: "Staff removed" },
    { value: "venue.add", label: "Venue added" },
    { value: "venue.remove", label: "Venue removed" },
    { value: "match.go_live", label: "Match went live" },
    { value: "match.score_update", label: "Score updated" },
    { value: "match.finalize", label: "Match finalized" },
    { value: "match.walkover", label: "Walkover awarded" },
    { value: "match.reset", label: "Match reset" },
    { value: "match.swap_teams", label: "Teams swapped" },
    { value: "match.schedule_update", label: "Match schedule updated" },
    { value: "tournament.schedule_bulk", label: "Bulk schedule applied" },
    { value: "dispute.resolve", label: "Dispute resolved" },
    { value: "dispute.reject", label: "Dispute rejected" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Role presets (permissions are editable independently)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ROLE_PRESETS = {
    admin: {
        name: "Administrator",
        description: "Full access to all tournaments",
        icon: Crown,
        color: "text-amber-400",
        bgColor: "bg-amber-500/10 border-amber-500/30",
        permissions: ALL_STAFF_PERMISSIONS,
    },
    mod: {
        name: "Moderator",
        description: "Assigned to specific tournaments",
        icon: Shield,
        color: "text-blue-400",
        bgColor: "bg-blue-500/10 border-blue-500/30",
        permissions: ["scores:update", "disputes:assist"] as StaffPermission[],
    },
    cohost: {
        name: "Co-Host",
        description: "Full permissions on assigned tournaments",
        icon: ShieldCheck,
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10 border-emerald-500/30",
        permissions: ["scores:update", "teams:manage", "bracket:edit", "announcements:send", "disputes:assist"] as StaffPermission[],
    },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Component Props
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface OrganizationStaffManagerProps {
    organizationId: string;
    ownerId: string;
    orgName?: string;
    orgLogo?: string | null;
    ownerName?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OrganizationStaffManager: React.FC<OrganizationStaffManagerProps> = ({
    organizationId,
    ownerId,
    orgName,
    orgLogo,
    ownerName,
}) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    // The actor performing the action should be the current user
    const actorId = currentUser?.id || ownerId;

    // ── State ──
    const [staff, setStaff] = useState<OrganizationStaffRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);

    // Invite form
    const [showInvitePanel, setShowInvitePanel] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [selectedRole, setSelectedRole] = useState<string>("mod");
    const [selectedPermissions, setSelectedPermissions] = useState<StaffPermission[]>(
        ROLE_PRESETS.mod.permissions
    );
    const [inviteTournamentIds, setInviteTournamentIds] = useState<string[]>([]);

    // Org tournaments
    const [orgTournaments, setOrgTournaments] = useState<{ id: string; name: string; status: string }[]>([]);

    // Expanded staff row
    const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
    const [permissionDraft, setPermissionDraft] = useState<StaffPermission[]>([]);
    const [savingPermissions, setSavingPermissions] = useState(false);
    const [assignmentEditId, setAssignmentEditId] = useState<string | null>(null);
    const [assignmentUseDefaults, setAssignmentUseDefaults] = useState(true);
    const [assignmentDraft, setAssignmentDraft] = useState<StaffPermission[]>([]);
    const [savingAssignmentPermissions, setSavingAssignmentPermissions] = useState(false);

    // Active section: "roster" | "audit"
    const [activeSection, setActiveSection] = useState<"roster" | "audit">("roster");

    // Audit log
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditTotal, setAuditTotal] = useState(0);
    const [auditActorId, setAuditActorId] = useState<string>("all");
    const [auditAction, setAuditAction] = useState<string>("all");
    const [auditTournamentId, setAuditTournamentId] = useState<string>("all");

    // Search
    const [searchQuery, setSearchQuery] = useState("");

    // ── Data Fetching ──
    const loadStaff = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const data = await fetchOrganizationStaff(organizationId);
            setStaff(data);
        } catch (error: any) {
            console.error("OrganizationStaffManager: Failed to load staff", error);
            toast({ title: "Failed to load staff", description: error.message, variant: "destructive" });
        } finally {
            if (!silent) setLoading(false);
        }
    }, [organizationId, toast]);

    const loadTournaments = useCallback(async () => {
        try {
            const data = await fetchOrgTournaments(organizationId);
            setOrgTournaments(data);
        } catch (e) {
            console.error("Failed to load tournaments:", e);
        }
    }, [organizationId]);

    const loadAuditLogs = useCallback(async () => {
        try {
            setAuditLoading(true);
            const { logs, total } = await fetchAuditLogs({
                organizationId,
                limit: 50,
                actionFilter: auditAction !== "all" ? auditAction : undefined,
                actorId: auditActorId !== "all" ? auditActorId : undefined,
                tournamentId: auditTournamentId !== "all" ? auditTournamentId : undefined,
            });
            setAuditLogs(logs);
            setAuditTotal(total);
        } catch (e: any) {
            console.error("Failed to load audit logs:", e);
        } finally {
            setAuditLoading(false);
        }
    }, [organizationId, auditAction, auditActorId, auditTournamentId]);

    const refreshAfterStaffChange = useCallback((silent = true) => {
        void loadStaff(silent);
        if (activeSection === 'audit') {
            void loadAuditLogs();
        }
    }, [loadStaff, loadAuditLogs, activeSection]);

    const auditActorOptions = useMemo(() => {
        const options: { id: string; label: string }[] = [
            { id: ownerId, label: ownerName ? `${ownerName} (Owner)` : "Organization owner" },
        ];
        for (const member of staff) {
            if (member.user_id === ownerId) continue;
            const name =
                member.profiles?.full_name ||
                member.profiles?.username ||
                member.profiles?.email ||
                "Staff member";
            options.push({ id: member.user_id, label: name });
        }
        return options;
    }, [staff, ownerId, ownerName]);

    const hasAuditFilters =
        auditActorId !== "all" || auditAction !== "all" || auditTournamentId !== "all";

    const clearAuditFilters = () => {
        setAuditActorId("all");
        setAuditAction("all");
        setAuditTournamentId("all");
    };

    useEffect(() => {
        loadStaff();
        loadTournaments();
    }, [loadStaff, loadTournaments]);

    useEffect(() => {
        if (activeSection === "audit") {
            loadAuditLogs();
        }
    }, [activeSection, loadAuditLogs]);

    useEffect(() => {
        if (!expandedStaffId) {
            setPermissionDraft([]);
            setAssignmentEditId(null);
            return;
        }
        const member = staff.find((s) => s.id === expandedStaffId);
        if (member) {
            setPermissionDraft([...(member.permissions ?? [])]);
        }
        setAssignmentEditId(null);
        // Init draft when opening a row only (not on every staff refresh while editing).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expandedStaffId]);

    const permissionsEqual = (a: StaffPermission[], b: StaffPermission[]) => {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
        return sortedA.every((p, i) => p === sortedB[i]);
    };

    const invalidateAccessForStaff = (member: OrganizationStaffRecord) => {
        invalidateStaffAccessCaches(queryClient);
        const tournamentIds = (member.tournament_assignments ?? []).map((a) => a.tournament_id);
        tournamentIds.forEach((tid) => {
            void queryClient.invalidateQueries({ queryKey: ['tournament-access', tid] });
        });
    };

    // ── Computed Stats ──
    const stats = useMemo(() => {
        const active = staff.filter((s) => s.status === "active");
        const pending = staff.filter((s) => s.status === "pending");
        const admins = active.filter((s) => s.role === "admin");
        return { total: staff.length, active: active.length, pending: pending.length, admins: admins.length };
    }, [staff]);

    // ── Filtered Staff ──
    const filteredStaff = useMemo(() => {
        if (!searchQuery.trim()) return staff;
        const q = searchQuery.toLowerCase();
        return staff.filter((s) =>
            s.profiles?.full_name?.toLowerCase().includes(q) ||
            s.profiles?.username?.toLowerCase().includes(q) ||
            s.profiles?.email?.toLowerCase().includes(q) ||
            s.role.toLowerCase().includes(q)
        );
    }, [staff, searchQuery]);

    // ── Handlers ──
    const handleRoleSelect = (role: string) => {
        setSelectedRole(role);
        const preset = ROLE_PRESETS[role as keyof typeof ROLE_PRESETS];
        if (preset) {
            setSelectedPermissions([...preset.permissions]);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;

        // Create optimistic record
        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticStaff: OrganizationStaffRecord = {
            id: optimisticId,
            organization_id: organizationId,
            user_id: optimisticId, // Placeholder
            role: selectedRole,
            permissions: selectedPermissions,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            assigned_by: ownerId,
            // Mock profile data for UI
            profiles: {
                email: inviteEmail.trim(),
                full_name: null,
                username: null,
            },
            tournament_assignments: []
        };

        try {
            setInviting(true);

            // Optimistically add to UI
            setStaff(prev => [optimisticStaff, ...prev]);

            await inviteOrganizationStaff({
                organizationId,
                userEmail: inviteEmail.trim(),
                role: selectedRole,
                permissions: selectedPermissions,
                assignedBy: actorId,
                orgName: orgName,
                orgLogo: orgLogo,
                inviterName: ownerName,
                tournamentIds: selectedRole !== "admin" ? inviteTournamentIds : undefined,
            });

            toast({ title: "Invitation sent!", description: `Invited ${inviteEmail} as ${selectedRole}` });
            invalidateStaffAccessCaches(queryClient);
            setInviteEmail("");
            setInviteTournamentIds([]);
            setShowInvitePanel(false);

            // Reload to get actual DB record
            refreshAfterStaffChange();
        } catch (err: any) {
            // Revert optimistic update
            setStaff(prev => prev.filter(s => s.id !== optimisticId));
            toast({ title: "Invite failed", description: err.message, variant: "destructive" });
        } finally {
            setInviting(false);
        }
    };

    const handleRemove = async (s: OrganizationStaffRecord) => {
        if (!confirm(`Remove ${s.profiles?.full_name || s.profiles?.email || "this staff member"}?`)) return;
        try {
            await removeOrganizationStaff({
                staffId: s.id,
                organizationId,
                actorId,
                staffEmail: s.profiles?.email || undefined,
            });
            toast({ title: "Staff removed" });
            refreshAfterStaffChange();
        } catch (err: any) {
            toast({ title: "Remove failed", description: err.message, variant: "destructive" });
        }
    };

    const handleUpdateRole = async (s: OrganizationStaffRecord, newRole: string) => {
        const preset = ROLE_PRESETS[newRole as keyof typeof ROLE_PRESETS];
        if (!preset) return;

        const currentPerms = s.permissions ?? [];
        const presetDiffers = !permissionsEqual(currentPerms, preset.permissions);
        if (presetDiffers) {
            const ok = confirm(
                `Apply the ${preset.name} preset? This will replace current permissions with: ${preset.permissions.join(', ')}`,
            );
            if (!ok) return;
        }

        const originalStaff = [...staff];

        try {
            setStaff(prev => prev.map(item =>
                item.id === s.id
                    ? { ...item, role: newRole, permissions: preset.permissions }
                    : item
            ));
            setPermissionDraft([...preset.permissions]);

            await updateOrganizationStaff({
                staffId: s.id,
                role: newRole,
                permissions: preset.permissions,
                organizationId,
                actorId,
            });
            toast({ title: "Role preset applied" });
            invalidateAccessForStaff(s);
            refreshAfterStaffChange();
        } catch (err: any) {
            setStaff(originalStaff);
            toast({ title: "Update failed", description: err.message, variant: "destructive" });
        }
    };

    const handleSavePermissions = async (s: OrganizationStaffRecord) => {
        if (s.role === "admin") return;

        const originalStaff = [...staff];
        try {
            setSavingPermissions(true);
            setStaff(prev => prev.map(item =>
                item.id === s.id ? { ...item, permissions: permissionDraft } : item
            ));

            await updateOrganizationStaff({
                staffId: s.id,
                role: s.role,
                permissions: permissionDraft,
                organizationId,
                actorId,
            });
            toast({ title: "Permissions saved" });
            invalidateAccessForStaff(s);
            refreshAfterStaffChange();
        } catch (err: any) {
            setStaff(originalStaff);
            toast({ title: "Save failed", description: err.message, variant: "destructive" });
        } finally {
            setSavingPermissions(false);
        }
    };

    const openAssignmentEditor = (assignment: TournamentAssignment, orgPermissions: StaffPermission[]) => {
        const hasOverride = assignment.permissions != null;
        setAssignmentEditId(assignment.id);
        setAssignmentUseDefaults(!hasOverride);
        setAssignmentDraft(
            hasOverride
                ? [...(assignment.permissions ?? [])]
                : [...orgPermissions],
        );
    };

    const handleSaveAssignmentPermissions = async (
        s: OrganizationStaffRecord,
        assignment: TournamentAssignment,
    ) => {
        const originalStaff = [...staff];
        const nextPermissions: StaffPermission[] | null = assignmentUseDefaults ? null : assignmentDraft;

        try {
            setSavingAssignmentPermissions(true);
            setStaff(prev => prev.map(item => {
                if (item.id !== s.id) return item;
                return {
                    ...item,
                    tournament_assignments: (item.tournament_assignments ?? []).map((a) =>
                        a.id === assignment.id ? { ...a, permissions: nextPermissions } : a
                    ),
                };
            }));

            await updateAssignmentPermissions({
                organizationId,
                assignmentId: assignment.id,
                permissions: nextPermissions,
            });
            toast({ title: assignmentUseDefaults ? "Using org defaults" : "Tournament permissions saved" });
            invalidateAccessForStaff(s);
            void queryClient.invalidateQueries({ queryKey: ['tournament-access', assignment.tournament_id] });
            setAssignmentEditId(null);
            refreshAfterStaffChange();
        } catch (err: any) {
            setStaff(originalStaff);
            toast({ title: "Save failed", description: err.message, variant: "destructive" });
        } finally {
            setSavingAssignmentPermissions(false);
        }
    };

    const handleAssignTournament = async (staffId: string, tournamentId: string) => {
        const originalStaff = [...staff];
        const tournament = orgTournaments.find(t => t.id === tournamentId);
        if (!tournament) return;

        try {
            // Optimistically update local state
            setStaff(prev => prev.map(item => {
                if (item.id === staffId) {
                    const newAssignment: TournamentAssignment = {
                        id: `optimistic-${Date.now()}`,
                        organization_staff_id: staffId,
                        tournament_id: tournamentId,
                        assigned_by: actorId,
                        created_at: new Date().toISOString(),
                        tournament: {
                            id: tournament.id,
                            name: tournament.name,
                            status: tournament.status
                        }
                    };
                    return {
                        ...item,
                        tournament_assignments: [...(item.tournament_assignments || []), newAssignment]
                    };
                }
                return item;
            }));

            await assignStaffToTournaments({
                orgStaffId: staffId,
                tournamentIds: [tournamentId],
                assignedBy: actorId,
                organizationId,
            });
            toast({ title: "Tournament assigned" });
            const member = staff.find((item) => item.id === staffId);
            if (member) invalidateAccessForStaff(member);
            else invalidateStaffAccessCaches(queryClient);
            void queryClient.invalidateQueries({ queryKey: ['tournament-access', tournamentId] });
            refreshAfterStaffChange();
        } catch (err: any) {
            setStaff(originalStaff);
            toast({ title: "Assignment failed", description: err.message, variant: "destructive" });
        }
    };

    const handleUnassignTournament = async (assignmentId: string) => {
        const originalStaff = [...staff];
        const removed = staff
            .flatMap((item) => (item.tournament_assignments ?? []).map((a) => ({ member: item, assignment: a })))
            .find((row) => row.assignment.id === assignmentId);
        try {
            setStaff(prev => prev.map(item => ({
                ...item,
                tournament_assignments: (item.tournament_assignments || []).filter(a => a.id !== assignmentId)
            })));

            await removeStaffFromTournament({
                assignmentId,
                organizationId,
                actorId,
            });
            toast({ title: "Tournament unassigned" });
            if (removed) {
                invalidateAccessForStaff(removed.member);
                void queryClient.invalidateQueries({
                    queryKey: ['tournament-access', removed.assignment.tournament_id],
                });
            } else {
                invalidateStaffAccessCaches(queryClient);
            }
            if (assignmentEditId === assignmentId) setAssignmentEditId(null);
            refreshAfterStaffChange();
        } catch (err: any) {
            setStaff(originalStaff);
            toast({ title: "Unassign failed", description: err.message, variant: "destructive" });
        }
    };

    const toggleTournamentForInvite = (tournamentId: string) => {
        setInviteTournamentIds((prev) =>
            prev.includes(tournamentId) ? prev.filter((id) => id !== tournamentId) : [...prev, tournamentId]
        );
    };

    // ── Render ──
    return (
        <div className="space-y-6">
            {/* ─── Stats ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total Staff", value: stats.total, icon: Users, color: "text-white" },
                    { label: "Active", value: stats.active, icon: ShieldCheck, color: "text-emerald-400" },
                    { label: "Pending", value: stats.pending, icon: ClipboardList, color: "text-amber-400" },
                    { label: "Admins", value: stats.admins, icon: Crown, color: "text-rose-400" },
                ].map((s) => (
                    <div key={s.label} className="p-4 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 hover:border-zinc-700/50 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">{s.label}</span>
                            <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                        </div>
                        <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* ─── Section Tabs ─── */}
            <div className="flex items-center gap-2 border-b border-zinc-800/50 pb-3">
                <button
                    onClick={() => setActiveSection("roster")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeSection === "roster"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                        }`}
                >
                    <Users className="w-4 h-4" />
                    Staff Roster
                </button>
                <button
                    onClick={() => setActiveSection("audit")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeSection === "audit"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                        }`}
                >
                    <History className="w-4 h-4" />
                    Audit Log
                    {auditTotal > 0 && (
                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-[10px]">
                            {auditTotal}
                        </Badge>
                    )}
                </button>
                <div className="ml-auto">
                    <Button
                        onClick={() => setShowInvitePanel(!showInvitePanel)}
                        className="bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-sm"
                        size="sm"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite Staff
                    </Button>
                </div>
            </div>

            {/* ─── Invite Panel ─── */}
            <AnimatePresence>
                {showInvitePanel && (
                    <motion.div
                        initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                        animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                        exit={{ opacity: 0, gridTemplateRows: '0fr' }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'grid', overflow: 'hidden' }}
                    >
                    <div style={{ minHeight: 0, overflow: 'hidden' }}>
                        <Card className="bg-[#0a0a0c] border-zinc-800/50 rounded-2xl">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base text-white">Invite New Staff</CardTitle>
                                    <Button variant="ghost" size="sm" onClick={() => setShowInvitePanel(false)}
                                        className="text-zinc-500 hover:text-white">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Email */}
                                <Input
                                    type="email"
                                    placeholder="staff@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 rounded-xl"
                                />

                                {/* Role Selection */}
                                <div>
                                    <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase mb-2">Role</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {Object.entries(ROLE_PRESETS).map(([key, preset]) => {
                                            const Icon = preset.icon;
                                            const selected = selectedRole === key;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => handleRoleSelect(key)}
                                                    className={`p-3 rounded-xl border text-left transition-all ${selected
                                                        ? preset.bgColor
                                                        : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Icon className={`w-4 h-4 ${selected ? preset.color : "text-zinc-500"}`} />
                                                        <span className={`text-sm font-semibold ${selected ? "text-white" : "text-zinc-400"}`}>
                                                            {preset.name}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-zinc-500">{preset.description}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Permissions */}
                                <div>
                                    <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase mb-2">Permissions</p>
                                    <StaffPermissionPicker
                                        value={selectedPermissions}
                                        onChange={setSelectedPermissions}
                                    />
                                </div>

                                {/* Tournament Assignment (only for non-admin) */}
                                {selectedRole !== "admin" && orgTournaments.length > 0 && (
                                    <div>
                                        <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase mb-2">
                                            Assign Tournaments
                                        </p>
                                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto overscroll-contain" data-lenis-prevent>
                                            {orgTournaments.map((t) => {
                                                const selected = inviteTournamentIds.includes(t.id);
                                                return (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => toggleTournamentForInvite(t.id)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected
                                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                            : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                                            }`}
                                                    >
                                                        <Trophy className="w-3 h-3" />
                                                        {t.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Send */}
                                <Button
                                    onClick={handleInvite}
                                    disabled={inviting || !inviteEmail.trim()}
                                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl"
                                >
                                    {inviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                                    {inviting ? "Sending Invite..." : "Send Invitation"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Staff Roster ─── */}
            {activeSection === "roster" && (
                <div className="space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                            placeholder="Search staff..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl"
                        />
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                        </div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <Users className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                            <p className="text-sm">No staff members yet. Invite someone to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredStaff.map((s) => {
                                const isExpanded = expandedStaffId === s.id;
                                const rolePreset = ROLE_PRESETS[s.role as keyof typeof ROLE_PRESETS];
                                const RoleIcon = rolePreset?.icon || Shield;
                                const roleColor = rolePreset?.color || "text-zinc-400";
                                const rawAssignments = s.tournament_assignments;
                                const assignedTournaments: any[] = Array.isArray(rawAssignments)
                                    ? rawAssignments
                                    : typeof rawAssignments === 'string'
                                        ? (() => { try { return JSON.parse(rawAssignments); } catch { return []; } })()
                                        : [];

                                return (
                                    <div key={s.id} className="rounded-2xl border border-zinc-800/50 bg-[#0a0a0c] overflow-hidden transition-all hover:border-zinc-700/50">
                                        {/* Row Header */}
                                        <button
                                            onClick={() => setExpandedStaffId(isExpanded ? null : s.id)}
                                            className="w-full flex items-center gap-3 p-4 text-left"
                                        >
                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {s.profiles?.avatar_url ? (
                                                    <img src={s.profiles.avatar_url} loading="lazy" alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-sm font-bold text-zinc-500">
                                                        {(s.profiles?.full_name || s.profiles?.username || "?")[0].toUpperCase()}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-white truncate">
                                                        {s.profiles?.full_name || s.profiles?.username || "Unknown"}
                                                    </span>
                                                    <Badge className={`text-[10px] ${rolePreset?.bgColor || "bg-zinc-800"} ${roleColor} border`}>
                                                        <RoleIcon className="w-3 h-3 mr-1" />
                                                        {rolePreset?.name || s.role}
                                                    </Badge>
                                                    <Badge
                                                        className={`text-[10px] ${s.status === "active"
                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                            : s.status === "pending"
                                                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                                                : "bg-red-500/10 text-red-400 border-red-500/30"
                                                            } border`}
                                                    >
                                                        {s.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-zinc-500 truncate">{s.profiles?.email}</p>
                                                {s.role !== "admin" && (
                                                    <StaffPermissionChips
                                                        permissions={s.permissions ?? []}
                                                        className="mt-1.5"
                                                    />
                                                )}
                                            </div>

                                            {/* Tournament count badge */}
                                            {s.role !== "admin" && assignedTournaments.length > 0 && (
                                                <Badge className="bg-zinc-800 text-zinc-400 text-[10px] border border-zinc-700">
                                                    <Trophy className="w-3 h-3 mr-1" />
                                                    {assignedTournaments.length}
                                                </Badge>
                                            )}

                                            {/* Expand arrow */}
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4 text-zinc-500" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-zinc-500" />
                                            )}
                                        </button>

                                        {/* Expanded Panel */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                                                    animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                                                    exit={{ opacity: 0, gridTemplateRows: '0fr' }}
                                                    transition={{ duration: 0.2 }}
                                                    style={{ display: 'grid', overflow: 'hidden' }}
                                                    className="border-t border-zinc-800/50"
                                                >
                                                <div style={{ minHeight: 0, overflow: 'hidden' }}>
                                                    <div className="p-4 space-y-4">
                                                        {/* Activity Timeline */}
                                                        <div>
                                                            <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Activity</p>
                                                            <div className="space-y-1 text-xs text-zinc-500">
                                                                <p>📩 Invited {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</p>
                                                                {s.accepted_at && (
                                                                    <p>✅ Accepted {formatDistanceToNow(new Date(s.accepted_at), { addSuffix: true })}</p>
                                                                )}
                                                                {s.responded_at && !s.accepted_at && (
                                                                    <p>❌ Declined {formatDistanceToNow(new Date(s.responded_at), { addSuffix: true })}</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Role presets */}
                                                        <div>
                                                            <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Apply Role Preset</p>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {Object.entries(ROLE_PRESETS).map(([key, preset]) => {
                                                                    const Icon = preset.icon;
                                                                    const active = s.role === key;
                                                                    return (
                                                                        <button
                                                                            key={key}
                                                                            onClick={() => handleUpdateRole(s, key)}
                                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active
                                                                                ? `${preset.bgColor} ${preset.color}`
                                                                                : "border-zinc-800 text-zinc-500 hover:border-zinc-700 bg-zinc-900"
                                                                                }`}
                                                                        >
                                                                            <Icon className="w-3 h-3" />
                                                                            {preset.name}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Org-level permissions */}
                                                        {s.role !== "admin" ? (
                                                            <div>
                                                                <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">
                                                                    Default Permissions
                                                                </p>
                                                                <p className="text-xs text-zinc-600 mb-2">
                                                                    Applied to all assigned tournaments unless a tournament override is set.
                                                                </p>
                                                                <StaffPermissionPicker
                                                                    value={permissionDraft}
                                                                    onChange={setPermissionDraft}
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    className="mt-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
                                                                    disabled={
                                                                        savingPermissions
                                                                        || permissionsEqual(permissionDraft, s.permissions ?? [])
                                                                    }
                                                                    onClick={() => handleSavePermissions(s)}
                                                                >
                                                                    {savingPermissions ? (
                                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                    ) : null}
                                                                    Save Permissions
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                                                <Crown className="w-4 h-4 text-amber-400" />
                                                                <p className="text-xs text-amber-400/80">
                                                                    Administrators have full access to <strong>all</strong> tournaments in this organization.
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Tournament Assignments (only for non-admin) */}
                                                        {s.role !== "admin" && (
                                                            <div>
                                                                <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">
                                                                    Tournament Assignments
                                                                </p>

                                                                {/* Current assignments */}
                                                                <div className="flex flex-wrap gap-2 mb-2">
                                                                    {assignedTournaments.length === 0 && (
                                                                        <span className="text-xs text-zinc-600 italic">No tournaments assigned</span>
                                                                    )}
                                                                    {assignedTournaments.map((a: TournamentAssignment) => {
                                                                        const hasCustom = a.permissions != null;
                                                                        const isEditing = assignmentEditId === a.id;
                                                                        return (
                                                                            <div key={a.id} className="w-full space-y-2">
                                                                                <span
                                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"
                                                                                >
                                                                                    <Trophy className="w-3 h-3" />
                                                                                    {(a.tournament as any)?.name || "Tournament"}
                                                                                    {hasCustom && (
                                                                                        <Badge className="text-[9px] bg-rose-500/15 text-rose-300 border-rose-500/30">
                                                                                            custom
                                                                                        </Badge>
                                                                                    )}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => openAssignmentEditor(a, s.permissions ?? [])}
                                                                                        className="ml-1 text-emerald-400/70 hover:text-white transition-colors underline-offset-2 hover:underline"
                                                                                    >
                                                                                        perms
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleUnassignTournament(a.id)}
                                                                                        className="ml-1 text-emerald-500/50 hover:text-red-400 transition-colors"
                                                                                    >
                                                                                        <X className="w-3 h-3" />
                                                                                    </button>
                                                                                </span>
                                                                                {isEditing && (
                                                                                    <div className="ml-1 p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
                                                                                        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={assignmentUseDefaults}
                                                                                                onChange={(e) => {
                                                                                                    const useDefaults = e.target.checked;
                                                                                                    setAssignmentUseDefaults(useDefaults);
                                                                                                    if (useDefaults) {
                                                                                                        setAssignmentDraft([...(s.permissions ?? [])]);
                                                                                                    }
                                                                                                }}
                                                                                                className="rounded border-zinc-600"
                                                                                            />
                                                                                            Use org default permissions
                                                                                        </label>
                                                                                        {!assignmentUseDefaults && (
                                                                                            <StaffPermissionPicker
                                                                                                value={assignmentDraft}
                                                                                                onChange={setAssignmentDraft}
                                                                                            />
                                                                                        )}
                                                                                        <div className="flex gap-2">
                                                                                            <Button
                                                                                                size="sm"
                                                                                                className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs"
                                                                                                disabled={savingAssignmentPermissions}
                                                                                                onClick={() => handleSaveAssignmentPermissions(s, a)}
                                                                                            >
                                                                                                {savingAssignmentPermissions ? (
                                                                                                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                                                                                ) : null}
                                                                                                Save
                                                                                            </Button>
                                                                                            <Button
                                                                                                size="sm"
                                                                                                variant="ghost"
                                                                                                className="text-zinc-500 text-xs"
                                                                                                onClick={() => setAssignmentEditId(null)}
                                                                                            >
                                                                                                Cancel
                                                                                            </Button>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* Add tournament */}
                                                                {orgTournaments.filter(
                                                                    (t) => !assignedTournaments.some((a) => a.tournament_id === t.id)
                                                                ).length > 0 && (
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {orgTournaments
                                                                                .filter((t) => !assignedTournaments.some((a) => a.tournament_id === t.id))
                                                                                .map((t) => (
                                                                                    <button
                                                                                        key={t.id}
                                                                                        onClick={() => handleAssignTournament(s.id, t.id)}
                                                                                        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-400 text-[11px] transition-all"
                                                                                    >
                                                                                        <Plus className="w-3 h-3" />
                                                                                        {t.name}
                                                                                    </button>
                                                                                ))}
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        )}

                                                        {/* Remove */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemove(s)}
                                                            className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 text-xs"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                                            Remove Staff Member
                                                        </Button>
                                                    </div>
                                                </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Audit Log ─── */}
            {activeSection === "audit" && (
                <div className="space-y-3">
                    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                                <Filter className="w-4 h-4 text-zinc-500" />
                                Filters
                            </div>
                            {hasAuditFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAuditFilters}
                                    className="text-zinc-400 hover:text-white h-8 px-2"
                                >
                                    Clear filters
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Select value={auditActorId} onValueChange={setAuditActorId}>
                                <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-white">
                                    <SelectValue placeholder="All members" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                    <SelectItem value="all">All members</SelectItem>
                                    {auditActorOptions.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={auditAction} onValueChange={setAuditAction}>
                                <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-white">
                                    <SelectValue placeholder="All actions" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                    <SelectItem value="all">All actions</SelectItem>
                                    {AUDIT_ACTION_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={auditTournamentId} onValueChange={setAuditTournamentId}>
                                <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-white">
                                    <SelectValue placeholder="All tournaments" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                    <SelectItem value="all">All tournaments</SelectItem>
                                    {orgTournaments.map((tournament) => (
                                        <SelectItem key={tournament.id} value={tournament.id}>
                                            {tournament.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Showing {auditTotal} event{auditTotal === 1 ? "" : "s"}
                        </p>
                    </div>

                    {auditLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                        </div>
                    ) : auditLogs.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <History className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                            <p className="text-sm">
                                {hasAuditFilters
                                    ? "No events match these filters."
                                    : "No audit events recorded yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {auditLogs.map((log) => {
                                const auditLink = resolveOrganizationAuditLogLink(log.action, log.details);
                                const isClickable = Boolean(auditLink);

                                return (
                                <div
                                    key={log.id}
                                    role={isClickable ? "button" : undefined}
                                    tabIndex={isClickable ? 0 : undefined}
                                    onClick={() => {
                                        if (auditLink) navigate(auditLink);
                                    }}
                                    onKeyDown={(event) => {
                                        if (!auditLink) return;
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            navigate(auditLink);
                                        }
                                    }}
                                    className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                                        isClickable
                                            ? "hover:bg-zinc-900/70 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                                            : "hover:bg-zinc-900/50"
                                    }`}
                                >
                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0 mt-0.5">
                                        {(log.actor as any)?.avatar_url ? (
                                            <img src={(log.actor as any).avatar_url} loading="lazy" alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-zinc-500">
                                                {((log.actor as any)?.full_name || (log.actor as any)?.username || "?")[0].toUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Event */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white">
                                                {(log.actor as any)?.full_name || (log.actor as any)?.username || "Unknown"}
                                            </span>
                                            <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 normal-case tracking-normal font-sans font-medium">
                                                {auditActionLabel(log.action, AUDIT_ACTION_OPTIONS)}
                                            </Badge>
                                        </div>
                                        {shouldShowOrganizationAuditDetailLine(log) && (
                                            <p
                                                className={
                                                    isTournamentOpsAudit(log.action)
                                                        ? "text-xs text-zinc-500 mt-0.5 leading-relaxed"
                                                        : "text-xs text-zinc-500 mt-0.5 truncate"
                                                }
                                            >
                                                {formatOrganizationAuditDetails(log)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Time */}
                                    <span className="text-[11px] text-zinc-600 whitespace-nowrap flex-shrink-0">
                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OrganizationStaffManager;
