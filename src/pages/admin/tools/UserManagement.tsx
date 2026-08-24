import { useState, useEffect, useMemo } from "react";
import { AdminPage } from "@/components/admin/AdminPage";
import {
    CommandButton,
    CommandSegmentedButton,
    CommandSection,
    CommandToolbar,
} from "@/components/management/CommandSurface";
import {
    Users,
    Search,
    Eye,
    Ban,
    Shield,
    CheckCircle,
    XCircle,
    RefreshCw,
    Download,
    UserCheck,
    ExternalLink,
    Globe,
    Gamepad2,
    Link2,
    Loader2,
    Filter,
    ChevronDown,
    ChevronUp,
    SortAsc,
    SortDesc,
    AlertTriangle,
    History,
    LogOut,
    Ghost,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAdminUsersList, useAdminRoleDefinitions, useAdminUserRoleAssignments, useAdminUserSuspend, useAdminUserUnsuspend, useAdminBulkUserAction, useRevokeSession } from "@/hooks/useAdminQueries";
import { useToast } from "@/hooks/use-toast";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAuth } from "@/hooks/useAuth";
import { useGhostMode } from "@/hooks/useGhostMode";
import { apiClient } from "@/lib/apiClient";
import { downloadCsvExport } from "@/lib/exportUtils";
import EntityHistoryTimeline from '@/components/admin/EntityHistoryTimeline';
import { AdminEntityActionMenu, type AdminEntityAction } from '@/components/admin/AdminEntityActionMenu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface UserRole {
    role: string;
}

interface User {
    id: string;
    username: string | null;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    created_at: string;
    is_suspended?: boolean;
    suspension_until?: string | null;
    suspension_reason?: string | null;
    suspension_type?: string | null;
    user_roles?: UserRole[];
    admin_roles?: string[];
}

 
interface UserDetail {
    profile: {
        id: string;
        username: string | null;
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
        bio: string | null;
        location: string | null;
        country_code: string | null;
        date_of_birth: string | null;
        riot_tag: string | null;
        steam_tag: string | null;
        social_links: Record<string, string> | null;
        card_image_url: string | null;
        banner_url: string | null;
        verification_status?: 'verified_organizer' | 'verified_venue_owner' | 'email_verified' | 'unverified';
        is_admin: boolean;
        admin_roles: string[] | null;
        is_suspended: boolean;
        suspension_reason: string | null;
        suspension_type: string | null;
        suspension_until: string | null;
        settings: Record<string, unknown> | null;
        created_at: string;
        updated_at: string | null;
    };
    licenses: { id: string; license_id: string; license_type: string; status: string; issued_at: string; expires_at: string | null; notes: string | null }[];
    user_roles: { role: string; is_active: boolean }[];
    verified_roles: { role: string; status: string; is_active: boolean; verified_at: string | null }[];
    organizations: { id: string; name: string; slug: string; logo_url: string | null }[];
    venues: { id: string; name: string; city: string | null; country: string | null; status: string }[];
    tournaments: { id: string; name: string; game: string | null; status: string }[];
    connected_accounts: { provider: string; provider_id: string; created_at: string; updated_at: string | null }[];
    teams: { id: string; name: string; tag: string | null; logo_url: string | null; role: string }[];
}

const USERS_PER_PAGE = 25;

const FIELD_LABEL_CLASS = "mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500";
const CONTROL_CLASS = "w-full -none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500";
const CHIP_NEUTRAL_CLASS = "border border-white/10 bg-transparent px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500";

// Social platforms store bare handles (the profile form uses "@username" inputs).
// Resolve platform + handle -> canonical URL. Full URLs pass through untouched.
const SOCIAL_URL_BUILDERS: Record<string, (v: string) => string> = {
    twitter: (v) => `https://x.com/${v.replace(/^@/, '')}`,
    x: (v) => `https://x.com/${v.replace(/^@/, '')}`,
    twitch: (v) => `https://twitch.tv/${v.replace(/^@/, '')}`,
    youtube: (v) => `https://youtube.com/@${v.replace(/^@/, '')}`,
    instagram: (v) => `https://instagram.com/${v.replace(/^@/, '')}`,
    facebook: (v) => `https://facebook.com/${v.replace(/^@/, '')}`,
    tiktok: (v) => `https://tiktok.com/@${v.replace(/^@/, '')}`,
};

function resolveSocialUrl(platform: string, value: string): string | null {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    const builder = SOCIAL_URL_BUILDERS[platform.toLowerCase()];
    return builder ? builder(value) : null;
}

function steamProfileUrl(tag: string): string {
    const v = tag.trim();
    return /^\d{17}$/.test(v) ? `https://steamcommunity.com/profiles/${v}` : `https://steamcommunity.com/id/${v}`;
}

const UserManagementTool = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { can } = useAdminAccess();
    const { profile } = useAuth();
    const { start: startGhostMode } = useGhostMode();
    const revokeSessionMutation = useRevokeSession();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(0);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [countryFilter, setCountryFilter] = useState<string>('');
    const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
    const [hasTeamFilter, setHasTeamFilter] = useState<string>('all');
    const [joinedFrom, setJoinedFrom] = useState<string>('');
    const [joinedTo, setJoinedTo] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('created_at');
    const [sortDir, setSortDir] = useState<string>('desc');
    const [showFilters, setShowFilters] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Bulk selection state
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [bulkConfirm, setBulkConfirm] = useState<{ action: string; reason?: string } | null>(null);
    const [bulkSuspendReason, setBulkSuspendReason] = useState('');
    const [revokeTarget, setRevokeTarget] = useState<User | null>(null);
    const [revokeReason, setRevokeReason] = useState('');
    const [ghostTarget, setGhostTarget] = useState<User | null>(null);
    const [ghostReason, setGhostReason] = useState('');
    const bulkAction = useAdminBulkUserAction();

    // Suspend Form State
    const [suspensionType, setSuspensionType] = useState<string>('Standard');
    const [suspensionDuration, setSuspensionDuration] = useState<string>('1 week');
    const [suspensionReason, setSuspensionReason] = useState<string>('');

    // ── React Query hooks ─────────────────────────────────────────────
    const usersQuery = useAdminUsersList({
        limit: USERS_PER_PAGE,
        offset: page * USERS_PER_PAGE,
        search: searchTerm || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        country: countryFilter || undefined,
        verified: verifiedFilter !== 'all' ? verifiedFilter : undefined,
        has_team: hasTeamFilter !== 'all' ? hasTeamFilter : undefined,
        joined_from: joinedFrom || undefined,
        joined_to: joinedTo || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
    });
    const rolesQuery = useAdminRoleDefinitions();
    const adminUserRolesQuery = useAdminUserRoleAssignments();
    const suspendMutation = useAdminUserSuspend();
    const unsuspendMutation = useAdminUserUnsuspend();

    const isLoading = usersQuery.isLoading;

    // Clear selection when page/filters change to prevent invisible stale selections
    useEffect(() => {
        setSelectedUserIds(new Set());
    }, [page, searchTerm, roleFilter, statusFilter, sortBy, sortDir]);

    // Derive enriched users from the three queries
    const profiles = useMemo(() => usersQuery.data?.users ?? [], [usersQuery.data?.users]);
    const totalUsers = usersQuery.data?.total ?? profiles.length;
    const roleCounts: Record<string, number> = usersQuery.data?.roleCounts ?? {};
    const adminCount = usersQuery.data?.adminCount ?? 0;
    const availableAdminRoles = rolesQuery.data?.map(r => r.name) ?? [];

    const users = useMemo(() => {
        const adminUserRoles = adminUserRolesQuery.data ?? [];
        return profiles.map((profile: any) => {
            const embeddedRoles = Array.isArray(profile.roles) ? profile.roles : [];
            const regularRoles = embeddedRoles.map((r: string) => ({ role: r }));

            const userAdminRoles = adminUserRoles
                .filter((aur: any) => aur.user_id === profile.id)
                .map((aur: any) => aur.role_name || aur.admin_roles?.name)
                .filter(Boolean);

            return {
                ...profile,
                user_roles: regularRoles,
                admin_roles: userAdminRoles
            };
        }) as User[];
    }, [profiles, adminUserRolesQuery.data]);

    // Debounce search input — triggers server-side search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(0);
            setSearchTerm(searchInput);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Fetch full user detail when a user is selected
    useEffect(() => {
        if (!selectedUser || suspendDialogOpen) {
            setUserDetail(null);
            return;
        }
        let cancelled = false;
        setDetailLoading(true);
        apiClient.get<UserDetail>(`/api/admin/users/${selectedUser.id}/detail`)
            .then(data => { if (!cancelled) setUserDetail(data); })
            .catch(() => { if (!cancelled) setUserDetail(null); })
            .finally(() => { if (!cancelled) setDetailLoading(false); });
        return () => { cancelled = true; };
    }, [selectedUser, suspendDialogOpen]);

    const handleRefresh= async () => {
        setRefreshing(true);
        await Promise.all([
            usersQuery.refetch(),
            rolesQuery.refetch(),
            adminUserRolesQuery.refetch(),
        ]);
        setRefreshing(false);
    };

    const resetFilters = () => {
        setSearchInput('');
        setSearchTerm('');
        setRoleFilter('all');
        setStatusFilter('all');
        setCountryFilter('');
        setVerifiedFilter('all');
        setHasTeamFilter('all');
        setJoinedFrom('');
        setJoinedTo('');
        setSortBy('created_at');
        setSortDir('desc');
        setPage(0);
    };

    const activeFilterCount = [
        roleFilter !== 'all',
        statusFilter !== 'all',
        countryFilter !== '',
        verifiedFilter !== 'all',
        hasTeamFilter !== 'all',
        joinedFrom !== '',
        joinedTo !== '',
    ].filter(Boolean).length;

    const handleViewProfile = (username: string | null) => {
        if (!username) {
            toast({ title: "Error", description: "User has no username set.", variant: "destructive" });
            return;
        }
        // Navigate to the user's public profile
        navigate(`/player/${username}`);
    };

    const handleSuspendUser = async (userId: string) => {
        if (!suspensionReason.trim()) {
            toast({ title: 'Error', description: 'Please provide a reason for suspension.', variant: 'destructive' });
            return;
        }

        try {
            // Calculate suspension_until
            let suspensionUntil: Date | null = null;
            const now = new Date();

            if (suspensionDuration === '24h') {
                suspensionUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            } else if (suspensionDuration === '1 week') {
                suspensionUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            } else if (suspensionDuration === '1 month') {
                suspensionUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            }
            // 'permanent' remains null

            // 1. Update Profile securely via RPC
            await suspendMutation.mutateAsync({
                userId,
                reason: suspensionReason,
                suspensionType,
                suspensionUntil: suspensionUntil?.toISOString() ?? null,
            });

            // 2. Log Action
            import('@/lib/auditLog').then(({ auditLog }) => {
                auditLog.userSuspended(
                    userId,
                    selectedUser?.full_name || selectedUser?.username || 'Unknown',
                    suspensionReason,
                    suspensionType,
                    suspensionUntil?.toISOString()
                );
            });

            toast({ title: 'User Suspended', description: `The user has been suspended (${suspensionDuration}).` });
            setSuspendDialogOpen(false);
            setSuspensionReason('');
        } catch (error: any) {
            console.error('Error suspending user:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSelectedUser(null);
        }
    };

    const handleUnsuspendUser = async (userId: string, targetName: string) => {
        try {
            // 1. Update Profile securely via RPC
            await unsuspendMutation.mutateAsync(userId);

            // 2. Log Action
            import('@/lib/auditLog').then(({ auditLog }) => {
                auditLog.userUnsuspended(
                    userId,
                    targetName,
                    'Administrative Unsuspension'
                );
            });

            toast({ title: 'User Unsuspended', description: 'The user has been unsuspended.' });
        } catch (error: any) {
            console.error('Error unsuspending user:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSelectedUser(null);
        }
    };

    const handleExport = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            await downloadCsvExport('/api/admin/export/users', {
                search: searchTerm,
                role: roleFilter !== 'all' ? roleFilter : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                country: countryFilter || undefined,
                verified: verifiedFilter !== 'all' ? verifiedFilter : undefined,
                has_team: hasTeamFilter !== 'all' ? hasTeamFilter : undefined,
                joined_from: joinedFrom || undefined,
                joined_to: joinedTo || undefined,
                sort_by: sortBy,
                sort_dir: sortDir,
            }, `users_export_${new Date().toISOString().split('T')[0]}.csv`);
            toast({ title: 'Export complete', description: 'Users CSV downloaded' });
        } catch (err: any) {
            toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
        } finally {
            setIsExporting(false);
        }
    };

    // Get user roles from user_roles array
    const getUserRoles = (user: User): string[] => {
        if (!user.user_roles || user.user_roles.length === 0) {
            return ['casual'];
        }
        return user.user_roles.map(ur => ur.role);
    };

    const filteredUsers = users;

    // Bulk selection helpers
    const toggleSelectUser = (userId: string) => {
        setSelectedUserIds(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedUserIds.size === filteredUsers.length) {
            setSelectedUserIds(new Set());
        } else {
            setSelectedUserIds(new Set(filteredUsers.map((u: any) => u.id)));
        }
    };

    const clearSelection = () => setSelectedUserIds(new Set());

    const handleBulkAction = async (action: string, reason?: string) => {
        if (selectedUserIds.size === 0) return;
        // Destructive actions require confirmation
        if (action === 'suspend') {
            setBulkConfirm({ action });
            return;
        }
        await bulkAction.mutateAsync({ userIds: Array.from(selectedUserIds), action, reason });
        clearSelection();
    };

    const confirmBulkAction = async () => {
        if (!bulkConfirm || selectedUserIds.size === 0) return;
        await bulkAction.mutateAsync({
            userIds: Array.from(selectedUserIds),
            action: bulkConfirm.action,
            reason: bulkSuspendReason || 'Bulk suspended by admin',
        });
        clearSelection();
        setBulkConfirm(null);
        setBulkSuspendReason('');
    };

    const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);

    const stats = {
        total: totalUsers,
        admins: adminCount,
        organizers: roleCounts['organizer'] ?? 0,
        venueOwners: roleCounts['venue_owner'] ?? 0,
        casual: Math.max(0, totalUsers - Object.values(roleCounts).reduce((a, b) => a + b, 0) - adminCount),
    };

    const getRoleBadge = (role: string, isAdmin = false) => {
        if (isAdmin) {
            return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
        }
        const styles: Record<string, string> = {
            'admin': 'border-red-500/30 bg-red-950/20 text-red-300',
            'organizer': 'border-white/25 bg-white/[0.04] text-zinc-200',
            'venue_owner': 'border-white/15 bg-transparent text-zinc-400',
            'casual': 'border-white/10 bg-transparent text-zinc-500',
        };
        return styles[role] || styles.casual;
    };

    const buildUserRowActions = (user: User): AdminEntityAction[] => [
        {
            id: 'view-details',
            label: 'View Details',
            icon: ExternalLink,
            permission: 'users:view',
            onClick: () => setSelectedUser(user),
        },
        {
            id: 'view-profile',
            label: 'View Public Profile',
            icon: Eye,
            onClick: () => handleViewProfile(user.username),
            disabled: !user.username,
        },
        ...(user.is_suspended ? [{
            id: 'unsuspend',
            label: 'Unsuspend User',
            icon: UserCheck,
            permission: 'users:ban',
            variant: 'success' as const,
            onClick: () => handleUnsuspendUser(user.id, user.full_name || user.username || 'Unknown'),
        }] : [{
            id: 'suspend',
            label: 'Suspend User',
            icon: Ban,
            permission: 'users:ban',
            variant: 'destructive' as const,
            separatorBefore: true,
            onClick: () => {
                setSelectedUser(user);
                setSuspendDialogOpen(true);
            },
        }]),
        {
            id: 'revoke-session',
            label: 'Revoke Session',
            icon: LogOut,
            permission: 'security:revoke_sessions',
            variant: 'destructive',
            separatorBefore: true,
            disabled: user.id === profile?.id,
            onClick: () => setRevokeTarget(user),
        },
        {
            id: 'ghost-mode',
            label: 'Enter Ghost Mode',
            icon: Ghost,
            permission: 'impersonation:start',
            variant: 'destructive',
            disabled: user.id === profile?.id,
            onClick: () => setGhostTarget(user),
        },
    ];

    const buildUserDetailActions = (user: User): AdminEntityAction[] => [
        {
            id: 'view-profile',
            label: 'Public Profile',
            icon: Eye,
            onClick: () => handleViewProfile(user.username),
            disabled: !user.username,
        },
        ...(user.is_suspended ? [{
            id: 'unsuspend',
            label: 'Unsuspend',
            icon: UserCheck,
            permission: 'users:ban',
            variant: 'success' as const,
            onClick: () => handleUnsuspendUser(user.id, user.full_name || user.username || 'Unknown'),
        }] : [{
            id: 'suspend',
            label: 'Suspend',
            icon: Ban,
            permission: 'users:ban',
            variant: 'destructive' as const,
            onClick: () => setSuspendDialogOpen(true),
        }]),
        {
            id: 'revoke-session',
            label: 'Revoke Session',
            icon: LogOut,
            permission: 'security:revoke_sessions',
            variant: 'destructive',
            separatorBefore: true,
            disabled: user.id === profile?.id,
            onClick: () => setRevokeTarget(user),
        },
        {
            id: 'ghost-mode',
            label: 'Enter Ghost Mode',
            icon: Ghost,
            permission: 'impersonation:start',
            variant: 'destructive',
            disabled: user.id === profile?.id,
            onClick: () => setGhostTarget(user),
        },
    ];

    const handleRevokeSession = () => {
        if (!revokeTarget) return;
        revokeSessionMutation.mutate(
            { userId: revokeTarget.id, reason: revokeReason || undefined },
            {
                onSettled: () => {
                    setRevokeTarget(null);
                    setRevokeReason('');
                },
            }
        );
    };

    const handleStartGhostMode = async () => {
        if (!ghostTarget) return;
        if (ghostReason.trim().length < 12) {
            toast({
                title: 'Reason required',
                description: 'Ghost Mode requires a clear audit reason with at least 12 characters.',
                variant: 'destructive',
            });
            return;
        }

        try {
            await startGhostMode({
                targetUserId: ghostTarget.id,
                reason: ghostReason.trim(),
                scopes: ['support:read'],
            });
            toast({
                title: 'Ghost Mode active',
                description: `You are now impersonating ${ghostTarget.username || ghostTarget.email || ghostTarget.id}.`,
            });
            setGhostTarget(null);
            setGhostReason('');
        } catch (error) {
            toast({
                title: 'Ghost Mode denied',
                description: (error as Error)?.message || 'Unable to start impersonation.',
                variant: 'destructive',
            });
        }
    };

    return (
        <AdminPage
            eyebrow="Users & Access"
            title="Users"
            description="Search, inspect, and act on platform users"
            actions={
                <>
                    <CommandButton variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </CommandButton>
                    {can('users:export') && (
                        <CommandButton size="sm" onClick={handleExport} disabled={isExporting}>
                            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            {isExporting ? 'Exporting…' : 'Export'}
                        </CommandButton>
                    )}
                </>
            }
        >
        <div className={`space-y-5 ${selectedUserIds.size > 0 ? 'pb-24' : ''}`}>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {[
                    { label: 'Total Users', value: stats.total, icon: Users },
                    { label: 'Admins', value: stats.admins, icon: Shield },
                    { label: 'Organizers', value: stats.organizers, icon: UserCheck },
                    { label: 'Venue Owners', value: stats.venueOwners, icon: CheckCircle },
                    { label: 'Casual', value: stats.casual, icon: Users },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="border border-white/10 bg-white/[0.025] p-4"
                    >
                        <stat.icon className="mb-2 h-4 w-4 text-zinc-500" />
                        <p className="text-xl font-black tabular-nums text-white">{stat.value}</p>
                        <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <CommandToolbar>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative lg:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                        <input
                            placeholder="Search users by name, username, or email..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full -none border border-white/10 bg-[#0a0a0c]/90 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        />
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {['all', 'admin', ...availableAdminRoles, 'organizer', 'venue_owner', 'casual'].filter((v, i, a) => a.indexOf(v) === i).map((role) => (
                            <CommandSegmentedButton
                                key={role}
                                active={roleFilter === role}
                                onClick={() => { setRoleFilter(role); setPage(0); }}
                            >
                                {role === 'all' ? 'All Roles' : role === 'venue_owner' ? 'Venue Owner' : role.replace('_', ' ')}
                            </CommandSegmentedButton>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <CommandButton variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                        <Filter className="h-4 w-4" />
                        Advanced Filters
                        {activeFilterCount > 0 && (
                            <span className="border border-rose-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-300">{activeFilterCount}</span>
                        )}
                        {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CommandButton>
                </div>
            </CommandToolbar>

            {/* Advanced Filters */}
            {showFilters && (
                <CommandSection className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Status Filter */}
                        <div>
                            <label className={FIELD_LABEL_CLASS}>Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                                className={CONTROL_CLASS}
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>

                        {/* Licensed Filter — "verified" means holds an approved license (organizer / venue owner / …) */}
                        <div>
                            <label className={FIELD_LABEL_CLASS}>Licensed</label>
                            <select
                                value={verifiedFilter}
                                onChange={(e) => { setVerifiedFilter(e.target.value); setPage(0); }}
                                className={CONTROL_CLASS}
                            >
                                <option value="all">All</option>
                                <option value="true">Licensed</option>
                                <option value="false">Unlicensed</option>
                            </select>
                        </div>

                        {/* Has Team Filter */}
                        <div>
                            <label className={FIELD_LABEL_CLASS}>Team Status</label>
                            <select
                                value={hasTeamFilter}
                                onChange={(e) => { setHasTeamFilter(e.target.value); setPage(0); }}
                                className={CONTROL_CLASS}
                            >
                                <option value="all">All</option>
                                <option value="true">Has Team</option>
                                <option value="false">No Team</option>
                            </select>
                        </div>

                        {/* Country Filter */}
                        <div>
                            <label className={FIELD_LABEL_CLASS}>Country Code</label>
                            <input
                                placeholder="e.g. AE, US, GB"
                                value={countryFilter}
                                onChange={(e) => { setCountryFilter(e.target.value.toUpperCase()); setPage(0); }}
                                maxLength={2}
                                className={CONTROL_CLASS}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Joined From */}
                        <div>
                            <label className={FIELD_LABEL_CLASS}>Joined From</label>
                            <input
                                type="date"
                                value={joinedFrom}
                                onChange={(e) => { setJoinedFrom(e.target.value); setPage(0); }}
                                className={`${CONTROL_CLASS} font-mono tabular-nums`}
                            />
                        </div>

                        {/* Joined To */}
                        <div>
                            <label className={FIELD_LABEL_CLASS}>Joined To</label>
                            <input
                                type="date"
                                value={joinedTo}
                                onChange={(e) => { setJoinedTo(e.target.value); setPage(0); }}
                                className={`${CONTROL_CLASS} font-mono tabular-nums`}
                            />
                        </div>

                        {/* Sort By */}
                        <div>
                            <label className={FIELD_LABEL_CLASS}>Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
                                className={CONTROL_CLASS}
                            >
                                <option value="created_at">Join Date</option>
                                <option value="username">Username</option>
                                <option value="updated_at">Last Active</option>
                            </select>
                        </div>

                        {/* Sort Direction */}
                        <div>
                            <label className={FIELD_LABEL_CLASS}>Order</label>
                            <CommandButton
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); setPage(0); }}
                                className="w-full"
                            >
                                {sortDir === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
                                {sortDir === 'desc' ? 'Newest First' : 'Oldest First'}
                            </CommandButton>
                        </div>
                    </div>

                    {/* Reset Button */}
                    {activeFilterCount > 0 && (
                        <div className="flex justify-end">
                            <CommandButton variant="ghost" size="sm" onClick={resetFilters}>
                                <XCircle className="h-4 w-4" />
                                Reset All Filters ({activeFilterCount})
                            </CommandButton>
                        </div>
                    )}
                </CommandSection>
            )}

            {usersQuery.error && (
                <div className="flex flex-col items-center gap-3 border border-red-500/20 bg-red-950/20 p-6">
                    <Ban className="h-6 w-6 text-red-300" />
                    <p className="font-medium text-red-300">Failed to load users</p>
                    <CommandButton variant="danger" size="sm" onClick={() => usersQuery.refetch()}>
                        Retry
                    </CommandButton>
                </div>
            )}

            {/* Users Table */}
            <div className="overflow-hidden border border-white/10 bg-[#0a0a0c]/92">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-xs">
                        <thead className="bg-black/40 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                            <tr>
                                <th className="w-10 px-4 py-3">
                                    <Checkbox
                                        checked={selectedUserIds.size === filteredUsers.length ? true : selectedUserIds.size > 0 ? "indeterminate" : false}
                                        onCheckedChange={toggleSelectAll}
                                        className="border-white/25 bg-black"
                                    />
                                </th>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Regular Roles</th>
                                <th className="px-4 py-3">Admin Roles</th>
                                <th className="px-4 py-3">Joined</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center">
                                        <div className="flex items-center justify-center gap-2 text-zinc-500">
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                                            Loading users...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="transition-colors hover:bg-white/[0.03]">
                                        <td className="px-4 py-3">
                                            <Checkbox
                                                checked={selectedUserIds.has(user.id)}
                                                onCheckedChange={() => toggleSelectUser(user.id)}
                                                className="border-white/25 bg-black"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/40">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} loading="lazy" alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Users className="h-4 w-4 text-zinc-500" />
                                                    )}
                                                    {user.is_suspended && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-red-500/60">
                                                            <Ban className="h-4 w-4 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-white">
                                                            {user.full_name || user.username || 'Unnamed'}
                                                        </p>
                                                        {user.is_suspended && (
                                                            <span className="border border-red-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase leading-none tracking-wider text-red-300">
                                                                Suspended
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="font-mono text-xs text-zinc-500">@{user.username || 'no-username'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-400">
                                            {user.email || 'No email'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {getUserRoles(user).map((role) => (
                                                    <span
                                                        key={role}
                                                        className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(role)}`}
                                                    >
                                                        {role === 'venue_owner' ? 'Venue' : role.replace('_', ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {user.admin_roles && user.admin_roles.map((role) => (
                                                    <span
                                                        key={role}
                                                        className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(role, true)}`}
                                                    >
                                                        {role.replace('_', ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono tabular-nums text-zinc-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <AdminEntityActionMenu actions={buildUserRowActions(user)} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bulk Action Floating Bar */}
            {selectedUserIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 border border-white/10 bg-[#0a0a0c]/95 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur">
                    <span className="mr-2 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                        {selectedUserIds.size} selected
                    </span>
                    <CommandButton
                        variant="danger"
                        size="sm"
                        onClick={() => handleBulkAction('suspend')}
                        disabled={bulkAction.isPending}
                    >
                        <Ban className="h-4 w-4" />
                        Suspend
                    </CommandButton>
                    <CommandButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBulkAction('unsuspend')}
                        disabled={bulkAction.isPending}
                    >
                        <UserCheck className="h-4 w-4" />
                        Unsuspend
                    </CommandButton>
                    <CommandButton variant="ghost" size="sm" onClick={clearSelection}>
                        Clear
                    </CommandButton>
                </div>
            )}

            {/* Bulk Suspend Confirmation Dialog */}
            <Dialog open={!!bulkConfirm} onOpenChange={(open) => { if (!open) { setBulkConfirm(null); setBulkSuspendReason(''); } }}>
                <DialogContent className="max-w-md -none border border-white/10 bg-[#0a0a0c] text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                            Confirm Bulk Suspend
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-zinc-400 text-sm">
                        You are about to suspend <span className="font-medium text-white">{selectedUserIds.size} user(s)</span>. This will immediately lock them out of the platform.
                    </p>
                    <div className="mt-2">
                        <label className={FIELD_LABEL_CLASS}>Reason</label>
                        <input
                            value={bulkSuspendReason}
                            onChange={(e) => setBulkSuspendReason(e.target.value)}
                            placeholder="Enter suspension reason..."
                            className={`${CONTROL_CLASS} mt-1`}
                        />
                    </div>
                    <DialogFooter className="mt-4">
                        <CommandButton variant="ghost" size="sm" onClick={() => { setBulkConfirm(null); setBulkSuspendReason(''); }}>
                            Cancel
                        </CommandButton>
                        <CommandButton
                            variant="danger"
                            size="sm"
                            onClick={confirmBulkAction}
                            disabled={bulkAction.isPending}
                        >
                            {bulkAction.isPending ? 'Suspending...' : `Suspend ${selectedUserIds.size} User(s)`}
                        </CommandButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="font-mono text-xs tabular-nums text-zinc-500">
                        Showing {page * USERS_PER_PAGE + 1}–{Math.min((page + 1) * USERS_PER_PAGE, totalUsers)} of {totalUsers} users
                    </p>
                    <div className="flex items-center gap-2">
                        <CommandButton
                            variant="ghost"
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                        >
                            Previous
                        </CommandButton>
                        <span className="px-2 font-mono text-xs tabular-nums text-zinc-400">
                            Page {page + 1} of {totalPages}
                        </span>
                        <CommandButton
                            variant="ghost"
                            size="sm"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next
                        </CommandButton>
                    </div>
                </div>
            )}

            {/* Suspend Dialog */}
            <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
                <DialogContent className="-none border border-white/10 bg-[#0a0a0c]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <Ban className="h-5 w-5 text-red-400" />
                            Suspend User
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-zinc-400">
                        Are you sure you want to suspend{' '}
                        <span className="font-medium text-white">
                            {selectedUser?.full_name || selectedUser?.username}
                        </span>?
                    </p>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className={FIELD_LABEL_CLASS}>Suspension Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Warning', 'Standard', 'Security', 'Permanent'].map(type => (
                                    <CommandSegmentedButton
                                        key={type}
                                        active={suspensionType === type}
                                        onClick={() => setSuspensionType(type)}
                                    >
                                        {type}
                                    </CommandSegmentedButton>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={FIELD_LABEL_CLASS}>Duration</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: '24 Hours', value: '24h' },
                                    { label: '1 Week', value: '1 week' },
                                    { label: '1 Month', value: '1 month' },
                                    { label: 'Permanent', value: 'permanent' },
                                ].map(duration => (
                                    <CommandSegmentedButton
                                        key={duration.value}
                                        active={suspensionDuration === duration.value}
                                        onClick={() => setSuspensionDuration(duration.value)}
                                    >
                                        {duration.label}
                                    </CommandSegmentedButton>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={FIELD_LABEL_CLASS}>Reason for Restriction</label>
                            <textarea
                                value={suspensionReason}
                                onChange={(e) => setSuspensionReason(e.target.value)}
                                placeholder="Explain the violation for the user and audit log..."
                                className="h-24 w-full resize-none -none border border-white/10 bg-black/60 p-3 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-red-500"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <CommandButton variant="ghost" size="sm" onClick={() => {
                            setSuspendDialogOpen(false);
                            setSuspensionReason('');
                        }}>
                            Cancel
                        </CommandButton>
                        <CommandButton
                            variant="danger"
                            size="sm"
                            onClick={() => selectedUser && handleSuspendUser(selectedUser.id)}
                            disabled={suspendMutation.isPending}
                        >
                            {suspendMutation.isPending ? 'Restricting...' : 'Apply Restriction'}
                        </CommandButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Detail Modal */}
            <Dialog open={!!selectedUser && !suspendDialogOpen} onOpenChange={() => setSelectedUser(null)}>
                <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col overflow-hidden -none border border-white/10 bg-[#0a0a0c] p-0">
                    <div className="sticky top-0 z-10 shrink-0 border-b border-white/10 bg-[#0a0a0c] px-6 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <DialogHeader className="space-y-1 text-left">
                                <DialogTitle className="flex items-center gap-2 text-white">
                                    <Users className="h-5 w-5 text-rose-400" />
                                    {selectedUser?.full_name || selectedUser?.username || 'User Details'}
                                </DialogTitle>
                                <p className="font-mono text-xs text-zinc-500">{selectedUser?.id}</p>
                            </DialogHeader>
                            {selectedUser && (
                                <AdminEntityActionMenu actions={buildUserDetailActions(selectedUser)} />
                            )}
                        </div>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto overscroll-contain px-6 py-4" data-lenis-prevent>
                    {detailLoading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
                        </div>
                    )}

                    {!detailLoading && userDetail && (() => {
                        const p = userDetail.profile;
                        return (
                            <div className="space-y-4">
                                {/* Basic Info Grid */}
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                    {[
                                        { label: 'Full Name', value: p.full_name },
                                        { label: 'Username', value: p.username },
                                        { label: 'Email', value: p.email },
                                        { label: 'Country', value: p.country_code || null },
                                        { label: 'Location', value: p.location },
                                        { label: 'Date of Birth', value: p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : null },
                                        { label: 'Joined', value: new Date(p.created_at).toLocaleDateString() },
                                        { label: 'Last Updated', value: p.updated_at ? new Date(p.updated_at).toLocaleDateString() : null },
                                    ].map((item) => (
                                        <div key={item.label} className="border border-white/10 bg-white/[0.025] p-3">
                                            <p className={FIELD_LABEL_CLASS}>{item.label}</p>
                                            <p className="mt-1 text-sm text-white">{item.value || 'N/A'}</p>
                                        </div>
                                    ))}
                                    <div className="border border-white/10 bg-white/[0.025] p-3">
                                        <p className={FIELD_LABEL_CLASS}>License Status</p>
                                        <div className="mt-1">
                                            {p.verification_status === 'verified_organizer' && (
                                                <Badge className="bg-white/10 text-white border border-white/25 font-mono uppercase tracking-wider">Licensed Organizer</Badge>
                                            )}
                                            {p.verification_status === 'verified_venue_owner' && (
                                                <Badge className="bg-white/10 text-white border border-white/25 font-mono uppercase tracking-wider">Licensed Venue Owner</Badge>
                                            )}
                                            {p.verification_status === 'email_verified' && (
                                                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Email confirmed · unlicensed</span>
                                            )}
                                            {(p.verification_status === 'unverified' || !p.verification_status) && (
                                                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">Unlicensed</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Suspension Status */}
                                {p.is_suspended && (
                                    <div className="border border-red-500/20 bg-red-950/20 p-3">
                                        <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-red-300">⚠ Suspended</p>
                                        <p className="text-sm text-white">{p.suspension_reason || 'No reason provided'}</p>
                                        <div className="mt-1 flex gap-4 font-mono text-xs tabular-nums text-zinc-400">
                                            {p.suspension_type && <span>Type: {p.suspension_type}</span>}
                                            {p.suspension_until && <span>Until: {new Date(p.suspension_until).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                )}

                                {/* Bio */}
                                {p.bio && (
                                    <div className="border border-white/10 bg-white/[0.025] p-3">
                                        <p className={`${FIELD_LABEL_CLASS} mb-1`}>Bio</p>
                                        <p className="text-sm leading-relaxed text-zinc-300">{p.bio}</p>
                                    </div>
                                )}

                                {/* Connected Accounts */}
                                {userDetail.connected_accounts.length > 0 && (
                                    <div className="border border-white/10 bg-white/[0.025] p-3">
                                        <p className={`${FIELD_LABEL_CLASS} mb-2`}>Connected Accounts</p>
                                        <div className="flex flex-wrap gap-2">
                                            {userDetail.connected_accounts.map((acc) => {
                                                const profileUrl = acc.provider.toLowerCase() === 'discord' && /^\d+$/.test(acc.provider_id)
                                                    ? `https://discord.com/users/${acc.provider_id}`
                                                    : null;
                                                return (
                                                    <a key={acc.provider}
                                                       href={profileUrl ?? '#'}
                                                       target={profileUrl ? '_blank' : undefined}
                                                       rel="noopener noreferrer"
                                                       onClick={profileUrl ? undefined : (e) => e.preventDefault()}
                                                       title={profileUrl ? `Open ${acc.provider} profile` : `Provider ID: ${acc.provider_id} (no public profile)`}
                                                       className="inline-flex items-center gap-1 border border-white/10 bg-black/40 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-zinc-300 transition-colors hover:border-rose-500/40 hover:text-rose-200">
                                                        <Globe className="h-3 w-3" />
                                                        {acc.provider}
                                                        <span className="text-zinc-500 tabular-nums normal-case">({acc.provider_id})</span>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Gaming Tags */}
                                {(p.riot_tag || p.steam_tag) && (
                                    <div className="border border-white/10 bg-white/[0.025] p-3">
                                        <p className={`${FIELD_LABEL_CLASS} mb-2`}>Gaming Tags</p>
                                        <div className="flex flex-wrap gap-3">
                                            {p.riot_tag && (
                                                <span className="flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-zinc-200">
                                                    <Gamepad2 className="h-3.5 w-3.5 text-red-400" /> Riot: {p.riot_tag}
                                                </span>
                                            )}
                                            {p.steam_tag && (
                                                <a href={steamProfileUrl(p.steam_tag)} target="_blank" rel="noopener noreferrer"
                                                   className="flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-zinc-200 transition-colors hover:text-rose-300">
                                                    <Gamepad2 className="h-3.5 w-3.5 text-zinc-400" /> Steam: {p.steam_tag}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Social Links */}
                                {p.social_links && Object.keys(p.social_links).length > 0 && (
                                    <div className="border border-white/10 bg-white/[0.025] p-3">
                                        <p className={`${FIELD_LABEL_CLASS} mb-2`}>Social Links</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(p.social_links).filter(([, v]) => v).map(([platform, url]) => {
                                                const resolved = resolveSocialUrl(platform, url as string);
                                                return resolved ? (
                                                    <a key={platform} href={resolved} target="_blank" rel="noopener noreferrer"
                                                       className="flex items-center gap-1 border border-white/10 bg-black/40 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-rose-300 transition-colors hover:border-white/25 hover:text-rose-200">
                                                        <Link2 className="h-3 w-3" /> {platform}
                                                    </a>
                                                ) : (
                                                    <span key={platform} title={`Handle: ${url}`}
                                                          className="flex items-center gap-1 border border-white/10 bg-black/40 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                                                        <Link2 className="h-3 w-3" /> {platform}: {url as string}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Teams */}
                                {userDetail.teams.length > 0 && (
                                    <div className="border border-white/10 bg-white/[0.025] p-3">
                                        <p className={`${FIELD_LABEL_CLASS} mb-2`}>Teams</p>
                                        <div className="space-y-2">
                                            {userDetail.teams.map((team) => (
                                                <div key={team.id} className="flex items-center gap-3 bg-white/[0.03] p-2">
                                                    {team.logo_url ? (
                                                        <img src={team.logo_url} alt={team.name} className="h-6 w-6 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[10px] text-zinc-400">{team.name?.[0]}</div>
                                                    )}
                                                    <span className="text-sm text-white">{team.name}</span>
                                                    {team.tag && <span className="font-mono text-xs text-zinc-500">[{team.tag}]</span>}
                                                    <span className={`ml-auto ${CHIP_NEUTRAL_CLASS}`}>{team.role}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Regular Roles */}
                                <div className="border border-white/10 bg-white/[0.025] p-3">
                                    <p className={`${FIELD_LABEL_CLASS} mb-2`}>Roles</p>
                                    <div className="flex flex-wrap gap-2">
                                        {userDetail.user_roles.filter(r => r.is_active).map((r) => (
                                            <span
                                                key={r.role}
                                                className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(r.role)}`}
                                            >
                                                {r.role.replace('_', ' ')}
                                            </span>
                                        ))}
                                        {userDetail.user_roles.filter(r => r.is_active).length === 0 && (
                                            <span className="text-sm text-zinc-500">No roles assigned</span>
                                        )}
                                    </div>
                                </div>

                                {/* Admin Roles */}
                                {p.admin_roles && p.admin_roles.length > 0 && (
                                    <div className="border border-white/10 bg-white/[0.025] p-3">
                                        <p className={`${FIELD_LABEL_CLASS} mb-2`}>Admin Roles</p>
                                        <div className="flex flex-wrap gap-2">
                                            {p.admin_roles.map((role) => (
                                                <span
                                                    key={role}
                                                    className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(role, true)}`}
                                                >
                                                    {role.replace('_', ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Licenses */}
                                {userDetail.licenses.length > 0 && (
                                    <div className="border border-white/10 bg-white/[0.025] p-3">
                                        <p className={`${FIELD_LABEL_CLASS} mb-2`}>Licenses</p>
                                        <div className="divide-y divide-white/5">
                                            {userDetail.licenses.map((lic) => (
                                                <div key={lic.id} className="flex items-center justify-between py-1.5 text-sm">
                                                    <span className="capitalize text-zinc-300">{lic.license_type}</span>
                                                    <span className={lic.status === 'active' ? CHIP_NEUTRAL_CLASS.replace('text-zinc-500', 'text-white border-white/40') : CHIP_NEUTRAL_CLASS}>
                                                        {lic.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Organizations & Venues */}
                                {(userDetail.organizations.length > 0 || userDetail.venues.length > 0) && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {userDetail.organizations.length > 0 && (
                                            <div className="border border-white/10 bg-white/[0.025] p-3">
                                                <p className={`${FIELD_LABEL_CLASS} mb-2`}>Organizations</p>
                                                {userDetail.organizations.map((org) => (
                                                    <p key={org.id} className="text-sm text-zinc-300">{org.name}</p>
                                                ))}
                                            </div>
                                        )}
                                        {userDetail.venues.length > 0 && (
                                            <div className="border border-white/10 bg-white/[0.025] p-3">
                                                <p className={`${FIELD_LABEL_CLASS} mb-2`}>Venues</p>
                                                {userDetail.venues.map((v) => (
                                                    <p key={v.id} className="text-sm text-zinc-300">{v.name} <span className={`ml-1 ${CHIP_NEUTRAL_CLASS}`}>{v.status}</span></p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tournaments */}
                                {userDetail.tournaments.length > 0 && (
                                    <div className="border border-white/10 bg-white/[0.025] p-3">
                                        <p className={`${FIELD_LABEL_CLASS} mb-2`}>Tournaments ({userDetail.tournaments.length})</p>
                                        <div className="custom-scrollbar max-h-32 space-y-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
                                            {userDetail.tournaments.map((t) => (
                                                <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                                                    <span className="mr-2 truncate text-zinc-300">{t.name}</span>
                                                    <span className={`shrink-0 ${CHIP_NEUTRAL_CLASS}`}>{t.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <CommandButton className="w-full" onClick={() => handleViewProfile(p.username)}>
                                    <Eye className="h-4 w-4" />
                                    View Full Profile
                                </CommandButton>
                            </div>
                        );
                    })()}

                    {!detailLoading && !userDetail && selectedUser && (
                        <div className="space-y-4">
                            <div className="border border-amber-500/20 bg-amber-950/20 p-3 text-sm text-amber-200">
                                Full detail payload unavailable — showing list snapshot only.
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Full Name', value: selectedUser.full_name },
                                    { label: 'Username', value: selectedUser.username },
                                    { label: 'Email', value: selectedUser.email },
                                    { label: 'Joined', value: new Date(selectedUser.created_at).toLocaleDateString() },
                                ].map((item) => (
                                    <div key={item.label} className="border border-white/10 bg-white/[0.025] p-3">
                                        <p className={FIELD_LABEL_CLASS}>{item.label}</p>
                                        <p className="mt-1 text-sm text-white">{item.value || 'N/A'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Change History */}
                    {selectedUser && (
                        <div className="mt-6 border-t border-white/10 pt-4">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                                <History className="h-4 w-4 text-zinc-400" />
                                Audit Timeline
                            </h3>
                            <EntityHistoryTimeline targetType="User" targetId={selectedUser.id} />
                        </div>
                    )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Revoke Session Dialog */}
            <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) { setRevokeTarget(null); setRevokeReason(''); } }}>
                <DialogContent className="max-w-md -none border border-white/10 bg-[#0a0a0c]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <LogOut className="h-5 w-5 text-red-400" />
                            Revoke Session
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-zinc-400">
                        Force logout for{' '}
                        <span className="font-medium text-white">
                            {revokeTarget?.full_name || revokeTarget?.username || revokeTarget?.email}
                        </span>
                        . Tokens are invalidated and cached permissions are evicted.
                    </p>
                    <div className="space-y-2">
                        <label htmlFor="user-revoke-reason" className={FIELD_LABEL_CLASS}>Reason (optional)</label>
                        <Textarea
                            id="user-revoke-reason"
                            value={revokeReason}
                            onChange={(e) => setRevokeReason(e.target.value)}
                            placeholder="Why are you revoking this session?"
                            className="resize-none -none border-white/10 bg-black/60 text-white focus:border-red-500"
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <CommandButton variant="ghost" size="sm" onClick={() => { setRevokeTarget(null); setRevokeReason(''); }}>
                            Cancel
                        </CommandButton>
                        <CommandButton
                            variant="danger"
                            size="sm"
                            onClick={handleRevokeSession}
                            disabled={revokeSessionMutation.isPending}
                        >
                            {revokeSessionMutation.isPending ? 'Revoking…' : 'Revoke Session'}
                        </CommandButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ghost Mode Dialog */}
            <Dialog open={!!ghostTarget} onOpenChange={(open) => { if (!open) { setGhostTarget(null); setGhostReason(''); } }}>
                <DialogContent className="max-w-md -none border border-red-500/30 bg-[#0a0a0c]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <Ghost className="h-5 w-5 text-red-400" />
                            Enter Ghost Mode
                        </DialogTitle>
                    </DialogHeader>
                    <div className="border border-red-500/20 bg-red-950/20 p-3 text-sm text-red-100">
                        You are requesting a 15-minute scoped impersonation token for{' '}
                        <span className="font-semibold text-white">
                            {ghostTarget?.full_name || ghostTarget?.username || ghostTarget?.email}
                        </span>
                        . Billing, wallet, GDPR, and admin routes are blocked while impersonating.
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="ghost-reason" className={FIELD_LABEL_CLASS}>Audit Reason</label>
                        <Textarea
                            id="ghost-reason"
                            value={ghostReason}
                            onChange={(e) => setGhostReason(e.target.value)}
                            placeholder="Required: describe the support/security reason"
                            className="resize-none -none border-white/10 bg-black/60 text-white focus:border-red-500"
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <CommandButton variant="ghost" size="sm" onClick={() => { setGhostTarget(null); setGhostReason(''); }}>
                            Cancel
                        </CommandButton>
                        <CommandButton
                            variant="danger"
                            size="sm"
                            onClick={handleStartGhostMode}
                            disabled={ghostReason.trim().length < 12}
                        >
                            Start 15-Min Ghost Mode
                        </CommandButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        </AdminPage>
    );
};

export default UserManagementTool;
