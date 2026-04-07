import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Users,
    Search,
    Eye,
    Ban,
    MoreVertical,
    Mail,
    Calendar,
    Shield,
    CheckCircle,
    XCircle,
    RefreshCw,
    Download,
    UserCheck,
    UserX,
    ExternalLink,
    MapPin,
    Globe,
    Gamepad2,
    Link2,
    Loader2,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminUsersList, useAdminRoleDefinitions, useAdminUserRoleAssignments, useAdminUserSuspend, useAdminUserUnsuspend, adminKeys } from "@/hooks/useAdminQueries";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/apiClient";
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

interface UserRole {
    role: string;
}

interface AdminRole {
    id: string;
    name: string;
    key?: string;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        faceit_nickname: string | null;
        social_links: Record<string, string> | null;
        card_image_url: string | null;
        banner_url: string | null;
        is_verified: boolean;
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

const UserManagementTool = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(0);

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
    });
    const rolesQuery = useAdminRoleDefinitions();
    const adminUserRolesQuery = useAdminUserRoleAssignments();
    const suspendMutation = useAdminUserSuspend();
    const unsuspendMutation = useAdminUserUnsuspend();

    const isLoading = usersQuery.isLoading;

    // Derive enriched users from the three queries
    const profiles = usersQuery.data?.users ?? [];
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
                reason: `${suspensionReason} [${suspensionType}, ${suspensionDuration}]`,
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

    const exportUsersCSV = () => {
        const csv = [
            ['ID', 'Username', 'Full Name', 'Email', 'Regular Roles', 'Admin Roles', 'Created At'],
            ...filteredUsers.map(u => [
                u.id,
                u.username,
                u.full_name,
                u.email,
                getUserRoles(u).join('; '),
                (u.admin_roles || []).join('; '),
                u.created_at
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Get user roles from user_roles array
    const getUserRoles = (user: User): string[] => {
        if (!user.user_roles || user.user_roles.length === 0) {
            return ['casual'];
        }
        return user.user_roles.map(ur => ur.role);
    };

    // Check if user has a specific role
    const userHasRole = (user: User, role: string): boolean => {
        const regularRoles = getUserRoles(user);
        const adminRoles = user.admin_roles || [];

        // Check regular roles
        if (role === 'casual') {
            return regularRoles.includes('casual') || (regularRoles.length === 0 && adminRoles.length === 0);
        }
        if (regularRoles.includes(role)) return true;

        // Check admin roles
        // We treat "admin" filter as "has any admin role"
        if (role === 'admin' && adminRoles.length > 0) return true;

        return adminRoles.includes(role);
    };

    const filteredUsers = users;

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
            return 'bg-violet-500/10 text-violet-400 border-violet-500/30';
        }
        const styles: Record<string, string> = {
            'admin': 'bg-red-500/10 text-red-400 border-red-500/30',
            'organizer': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
            'venue_owner': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
            'casual': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
        };
        return styles[role] || styles.casual;
    };

    return (
        <div className="min-h-screen p-4 lg:p-8">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8"
            >
                <div className="flex items-center gap-4">
                    <Link to="/admin/dashboard">
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">User Management</h1>
                            <p className="text-zinc-500 text-sm">Manage platform users and permissions</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="border-zinc-800 text-zinc-400 hover:text-white"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={exportUsersCSV}
                        className="bg-rose-500 hover:bg-rose-600 text-white"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </motion.header>

            {/* Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"
            >
                {[
                    { label: 'Total Users', value: stats.total, icon: Users, color: 'rose' },
                    { label: 'Admins', value: stats.admins, icon: Shield, color: 'violet' },
                    { label: 'Organizers', value: stats.organizers, icon: UserCheck, color: 'amber' },
                    { label: 'Venue Owners', value: stats.venueOwners, icon: CheckCircle, color: 'emerald' },
                    { label: 'Casual', value: stats.casual, icon: Users, color: 'zinc' },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="p-4 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                        </div>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        <p className="text-xs text-zinc-500">{stat.label}</p>
                    </div>
                ))}
            </motion.div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col md:flex-row gap-3 mb-6"
            >
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        placeholder="Search users by name, username, or email..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-9 bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {['all', 'admin', ...availableAdminRoles, 'organizer', 'venue_owner', 'casual'].filter((v, i, a) => a.indexOf(v) === i).map((role) => (
                        <Button
                            key={role}
                            variant="outline"
                            size="sm"
                            onClick={() => { setRoleFilter(role); setPage(0); }}
                            className={`border-zinc-800 capitalize ${roleFilter === role ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'text-zinc-400'}`}
                        >
                            {role === 'all' ? 'All Roles' : role === 'venue_owner' ? 'Venue Owner' : role.replace('_', ' ')}
                        </Button>
                    ))}
                </div>
            </motion.div>

            {/* Users Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-zinc-900/50">
                                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Regular Roles</th>
                                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Admin Roles</th>
                                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Joined</th>
                                <th className="px-6 py-3 text-right text-xs font-mono text-zinc-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12">
                                        <div className="flex items-center justify-center gap-2 text-zinc-500">
                                            <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                            Loading users...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-zinc-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user, idx) => (
                                    <motion.tr
                                        key={user.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: idx * 0.01 }}
                                        className="hover:bg-zinc-900/30 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center overflow-hidden relative">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} loading="lazy" alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Users className="w-5 h-5 text-rose-500" />
                                                    )}
                                                    {user.is_suspended && (
                                                        <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center">
                                                            <Ban className="w-4 h-4 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-white">
                                                            {user.full_name || user.username || 'Unnamed'}
                                                        </p>
                                                        {user.is_suspended && (
                                                            <Badge variant="destructive" className="text-[10px] h-4 px-1 leading-none bg-red-500/10 text-red-500 border-red-500/20">
                                                                Suspended
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-zinc-500">@{user.username || 'no-username'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-400">
                                            {user.email || 'No email'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1 flex-wrap">
                                                {getUserRoles(user).map((role) => (
                                                    <Badge
                                                        key={role}
                                                        className={`${getRoleBadge(role)} border text-xs capitalize`}
                                                    >
                                                        {role === 'venue_owner' ? 'Venue' : role}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1 flex-wrap">
                                                {user.admin_roles && user.admin_roles.map((role) => (
                                                    <Badge
                                                        key={role}
                                                        className={`${getRoleBadge(role, true)} border text-xs capitalize`}
                                                    >
                                                        {role.replace('_', ' ')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-[#0a0a0c] border-zinc-800">
                                                    <DropdownMenuItem
                                                        className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                                                        onClick={() => handleViewProfile(user.username)}
                                                    >
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-blue-400 focus:text-blue-300 focus:bg-blue-500/10"
                                                        onClick={() => setSelectedUser(user)}
                                                    >
                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    {user.is_suspended ? (
                                                        <DropdownMenuItem
                                                            className="text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10"
                                                            onClick={() => handleUnsuspendUser(user.id, user.full_name || user.username || 'Unknown')}
                                                        >
                                                            <UserCheck className="w-4 h-4 mr-2" />
                                                            Unsuspend User
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setSuspendDialogOpen(true);
                                                            }}
                                                        >
                                                            <Ban className="w-4 h-4 mr-2" />
                                                            Suspend User
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                    <p className="text-sm text-zinc-500">
                        Showing {page * USERS_PER_PAGE + 1}–{Math.min((page + 1) * USERS_PER_PAGE, totalUsers)} of {totalUsers} users
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30"
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-zinc-400 px-2">
                            Page {page + 1} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                            className="border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Suspend Dialog */}
            <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
                <DialogContent className="bg-[#0a0a0c] border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Ban className="w-5 h-5 text-red-500" />
                            Suspend User
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-zinc-400">
                        Are you sure you want to suspend{' '}
                        <span className="text-white font-medium">
                            {selectedUser?.full_name || selectedUser?.username}
                        </span>?
                    </p>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Suspension Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Warning', 'Standard', 'Security', 'Permanent'].map(type => (
                                    <Button
                                        key={type}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSuspensionType(type)}
                                        className={`border-zinc-800 text-xs ${suspensionType === type ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'text-zinc-500'}`}
                                    >
                                        {type}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Duration</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: '24 Hours', value: '24h' },
                                    { label: '1 Week', value: '1 week' },
                                    { label: '1 Month', value: '1 month' },
                                    { label: 'Permanent', value: 'permanent' },
                                ].map(duration => (
                                    <Button
                                        key={duration.value}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSuspensionDuration(duration.value)}
                                        className={`border-zinc-800 text-xs ${suspensionDuration === duration.value ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'text-zinc-500'}`}
                                    >
                                        {duration.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Reason for Restriction</label>
                            <textarea
                                value={suspensionReason}
                                onChange={(e) => setSuspensionReason(e.target.value)}
                                placeholder="Explain the violation for the user and audit log..."
                                className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-red-500/50 resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setSuspendDialogOpen(false);
                            setSuspensionReason('');
                        }} className="border-zinc-800">
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-500 hover:bg-red-600 px-8"
                            onClick={() => selectedUser && handleSuspendUser(selectedUser.id)}
                            disabled={suspendMutation.isPending}
                        >
                            {suspendMutation.isPending ? 'Restricting...' : 'Apply Restriction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Detail Modal */}
            <Dialog open={!!selectedUser && !suspendDialogOpen} onOpenChange={() => setSelectedUser(null)}>
                <DialogContent className="bg-[#0a0a0c] border-zinc-800 max-w-4xl max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-rose-500" />
                            User Details
                        </DialogTitle>
                    </DialogHeader>

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
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                                        <div key={item.label} className="p-3 rounded-xl bg-zinc-900/50">
                                            <p className="text-xs text-zinc-500 uppercase">{item.label}</p>
                                            <p className="text-white text-sm mt-1">{item.value || 'N/A'}</p>
                                        </div>
                                    ))}
                                    <div className="p-3 rounded-xl bg-zinc-900/50">
                                        <p className="text-xs text-zinc-500 uppercase">Verified</p>
                                        <div className="mt-1">{p.is_verified
                                            ? <Badge className="bg-green-500/10 text-green-400 border-green-500/20 border">Verified</Badge>
                                            : <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 border">Unverified</Badge>}
                                        </div>
                                    </div>
                                </div>

                                {/* Suspension Status */}
                                {p.is_suspended && (
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <p className="text-xs text-red-400 uppercase mb-1">⚠ Suspended</p>
                                        <p className="text-sm text-white">{p.suspension_reason || 'No reason provided'}</p>
                                        <div className="flex gap-4 mt-1 text-xs text-zinc-400">
                                            {p.suspension_type && <span>Type: {p.suspension_type}</span>}
                                            {p.suspension_until && <span>Until: {new Date(p.suspension_until).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                )}

                                {/* Bio */}
                                {p.bio && (
                                    <div className="p-3 rounded-xl bg-zinc-900/50">
                                        <p className="text-xs text-zinc-500 uppercase mb-1">Bio</p>
                                        <p className="text-sm text-zinc-300">{p.bio}</p>
                                    </div>
                                )}

                                {/* Connected Accounts */}
                                {userDetail.connected_accounts.length > 0 && (
                                    <div className="p-3 rounded-xl bg-zinc-900/50">
                                        <p className="text-xs text-zinc-500 uppercase mb-2">Connected Accounts</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {userDetail.connected_accounts.map((acc) => (
                                                <Badge key={acc.provider} className="bg-zinc-800 text-zinc-300 border-zinc-700 border capitalize gap-1">
                                                    <Globe className="w-3 h-3" />
                                                    {acc.provider}
                                                    <span className="text-zinc-500 text-[10px]">({acc.provider_id})</span>
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Gaming Tags */}
                                {(p.riot_tag || p.faceit_nickname) && (
                                    <div className="p-3 rounded-xl bg-zinc-900/50">
                                        <p className="text-xs text-zinc-500 uppercase mb-2">Gaming Tags</p>
                                        <div className="flex gap-3 flex-wrap">
                                            {p.riot_tag && (
                                                <span className="text-sm text-zinc-300 flex items-center gap-1">
                                                    <Gamepad2 className="w-3.5 h-3.5 text-red-400" /> Riot: {p.riot_tag}
                                                </span>
                                            )}
                                            {p.faceit_nickname && (
                                                <span className="text-sm text-zinc-300 flex items-center gap-1">
                                                    <Gamepad2 className="w-3.5 h-3.5 text-orange-400" /> Faceit: {p.faceit_nickname}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Social Links */}
                                {p.social_links && Object.keys(p.social_links).length > 0 && (
                                    <div className="p-3 rounded-xl bg-zinc-900/50">
                                        <p className="text-xs text-zinc-500 uppercase mb-2">Social Links</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {Object.entries(p.social_links).map(([platform, url]) => (
                                                <a key={platform} href={url as string} target="_blank" rel="noopener noreferrer"
                                                   className="text-sm text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-lg">
                                                    <Link2 className="w-3 h-3" /> {platform}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Teams */}
                                {userDetail.teams.length > 0 && (
                                    <div className="p-3 rounded-xl bg-zinc-900/50">
                                        <p className="text-xs text-zinc-500 uppercase mb-2">Teams</p>
                                        <div className="space-y-2">
                                            {userDetail.teams.map((team) => (
                                                <div key={team.id} className="flex items-center gap-3 bg-zinc-800/50 p-2 rounded-lg">
                                                    {team.logo_url ? (
                                                        <img src={team.logo_url} alt={team.name} className="w-6 h-6 rounded object-cover" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400">{team.name?.[0]}</div>
                                                    )}
                                                    <span className="text-sm text-white">{team.name}</span>
                                                    {team.tag && <span className="text-xs text-zinc-500">[{team.tag}]</span>}
                                                    <Badge className="ml-auto bg-zinc-700 text-zinc-300 border-0 text-[10px] capitalize">{team.role}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Regular Roles */}
                                <div className="p-3 rounded-xl bg-zinc-900/50">
                                    <p className="text-xs text-zinc-500 uppercase mb-2">Roles</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {userDetail.user_roles.filter(r => r.is_active).map((r) => (
                                            <Badge key={r.role} className={`${getRoleBadge(r.role)} border capitalize`}>
                                                {r.role}
                                            </Badge>
                                        ))}
                                        {userDetail.user_roles.filter(r => r.is_active).length === 0 && (
                                            <span className="text-sm text-zinc-500">No roles assigned</span>
                                        )}
                                    </div>
                                </div>

                                {/* Admin Roles */}
                                {p.admin_roles && p.admin_roles.length > 0 && (
                                    <div className="p-3 rounded-xl bg-zinc-900/50">
                                        <p className="text-xs text-zinc-500 uppercase mb-2">Admin Roles</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {p.admin_roles.map((role) => (
                                                <Badge key={role} className={`${getRoleBadge(role, true)} border capitalize`}>
                                                    {role.replace('_', ' ')}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Licenses */}
                                {userDetail.licenses.length > 0 && (
                                    <div className="p-3 rounded-xl bg-zinc-900/50">
                                        <p className="text-xs text-zinc-500 uppercase mb-2">Licenses</p>
                                        <div className="space-y-1">
                                            {userDetail.licenses.map((lic) => (
                                                <div key={lic.id} className="flex items-center justify-between text-sm">
                                                    <span className="text-zinc-300 capitalize">{lic.license_type}</span>
                                                    <Badge className={lic.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20 border' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20 border'}>
                                                        {lic.status}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Organizations & Venues */}
                                {(userDetail.organizations.length > 0 || userDetail.venues.length > 0) && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {userDetail.organizations.length > 0 && (
                                            <div className="p-3 rounded-xl bg-zinc-900/50">
                                                <p className="text-xs text-zinc-500 uppercase mb-2">Organizations</p>
                                                {userDetail.organizations.map((org) => (
                                                    <p key={org.id} className="text-sm text-zinc-300">{org.name}</p>
                                                ))}
                                            </div>
                                        )}
                                        {userDetail.venues.length > 0 && (
                                            <div className="p-3 rounded-xl bg-zinc-900/50">
                                                <p className="text-xs text-zinc-500 uppercase mb-2">Venues</p>
                                                {userDetail.venues.map((v) => (
                                                    <p key={v.id} className="text-sm text-zinc-300">{v.name} ({v.status})</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tournaments */}
                                {userDetail.tournaments.length > 0 && (
                                    <div className="p-3 rounded-xl bg-zinc-900/50">
                                        <p className="text-xs text-zinc-500 uppercase mb-2">Tournaments ({userDetail.tournaments.length})</p>
                                        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                            {userDetail.tournaments.map((t) => (
                                                <div key={t.id} className="flex items-center justify-between text-sm">
                                                    <span className="text-zinc-300 truncate mr-2">{t.name}</span>
                                                    <Badge className="bg-zinc-700 text-zinc-300 border-0 text-[10px] shrink-0">{t.status}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    className="w-full bg-rose-500 hover:bg-rose-600"
                                    onClick={() => handleViewProfile(p.username)}
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Full Profile
                                </Button>
                            </div>
                        );
                    })()}

                    {!detailLoading && !userDetail && selectedUser && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Full Name', value: selectedUser.full_name },
                                    { label: 'Username', value: selectedUser.username },
                                    { label: 'Email', value: selectedUser.email },
                                    { label: 'Joined', value: new Date(selectedUser.created_at).toLocaleDateString() },
                                ].map((item) => (
                                    <div key={item.label} className="p-3 rounded-xl bg-zinc-900/50">
                                        <p className="text-xs text-zinc-500 uppercase">{item.label}</p>
                                        <p className="text-white text-sm mt-1">{item.value || 'N/A'}</p>
                                    </div>
                                ))}
                            </div>
                            <Button
                                className="w-full bg-rose-500 hover:bg-rose-600"
                                onClick={() => handleViewProfile(selectedUser.username)}
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                View Full Profile
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UserManagementTool;
