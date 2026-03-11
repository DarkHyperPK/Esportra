import { useState, useEffect, useCallback } from "react";
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
    ExternalLink
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
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
    admin_roles?: string[]; // Array of role names
}

const UserManagementTool = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [availableAdminRoles, setAvailableAdminRoles] = useState<string[]>([]);

    // Suspend Form State
    const [suspensionType, setSuspensionType] = useState<string>('Standard');
    const [suspensionDuration, setSuspensionDuration] = useState<string>('1 week');
    const [suspensionReason, setSuspensionReason] = useState<string>('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);

        try {
            // 1. Fetch profiles
            const profiles = await apiClient.get<Array<{
                id: string; username: string | null; full_name: string | null; email: string | null;
                avatar_url: string | null; created_at: string; is_suspended?: boolean;
                suspension_until?: string | null; suspension_reason?: string | null; suspension_type?: string | null;
            }>>('/api/admin/users?order=created_at.desc');

            // 2. Fetch all regular user roles
            let roles: Array<{ user_id: string; role: string }> = [];
            try {
                roles = await apiClient.get<Array<{ user_id: string; role: string }>>('/api/admin/user-roles');
            } catch (err) {
                console.error('Error fetching roles:', err);
            }

            // 3. Fetch admin role definitions
            let adminRoleDefs: Array<{ id: string; name: string }> = [];
            try {
                adminRoleDefs = await apiClient.get<Array<{ id: string; name: string }>>('/api/admin/roles');
                setAvailableAdminRoles(adminRoleDefs?.map(r => r.name) || []);
            } catch (err) {
                console.warn('Error fetching admin role definitions (might not exist):', err);
            }

            // 4. Fetch admin user role assignments
            let adminUserRoles: Array<any> = [];
            try {
                adminUserRoles = await apiClient.get<Array<any>>('/api/admin/admin-user-roles');
            } catch (err) {
                console.warn('Error fetching admin user roles:', err);
            }

            // Combine everything
            const usersWithRoles = (profiles || []).map(profile => {
                // Regular roles
                const regularRoles = (roles || [])
                    .filter(r => r.user_id === profile.id)
                    .map(r => ({ role: r.role }));

                // Admin roles
                const userAdminRoles = (adminUserRoles || [])
                    .filter((aur: any) => aur.user_id === profile.id)
                    .map((aur: any) => aur.admin_roles?.name)
                    .filter(Boolean);

                return {
                    ...profile,
                    user_roles: regularRoles,
                    admin_roles: userAdminRoles
                };
            });

            setUsers(usersWithRoles as User[]);
        } catch (err) {
            console.error('Error:', err);
        }

        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchUsers();
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
            setLoading(true);

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
            await apiClient.post(`/api/admin/users/${userId}/suspend`, {
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
            fetchUsers();
        } catch (error: any) {
            console.error('Error suspending user:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
            setSelectedUser(null);
        }
    };

    const handleUnsuspendUser = async (userId: string, targetName: string) => {
        try {
            setLoading(true);

            // 1. Update Profile securely via RPC
            await apiClient.post(`/api/admin/users/${userId}/unsuspend`);

            // 2. Log Action
            import('@/lib/auditLog').then(({ auditLog }) => {
                auditLog.userUnsuspended(
                    userId,
                    targetName,
                    'Administrative Unsuspension'
                );
            });

            toast({ title: 'User Unsuspended', description: 'The user has been unsuspended.' });
            fetchUsers();
        } catch (error: any) {
            console.error('Error unsuspending user:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
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

    const filteredUsers = users.filter(user => {
        const matchesSearch = !searchTerm ||
            user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter === 'all' || userHasRole(user, roleFilter);

        return matchesSearch && matchesRole;
    });

    const stats = {
        total: users.length,
        admins: users.filter(u => (u.admin_roles && u.admin_roles.length > 0)).length,
        organizers: users.filter(u => userHasRole(u, 'organizer')).length,
        venueOwners: users.filter(u => userHasRole(u, 'venue_owner')).length,
        casual: users.filter(u => {
            const regularRoles = getUserRoles(u);
            const adminRoles = u.admin_roles || [];
            return (regularRoles.length === 0 || (regularRoles.length === 1 && regularRoles[0] === 'casual')) && adminRoles.length === 0;
        }).length,
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
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {['all', 'admin', ...availableAdminRoles, 'organizer', 'venue_owner', 'casual'].filter((v, i, a) => a.indexOf(v) === i).map((role) => (
                        <Button
                            key={role}
                            variant="outline"
                            size="sm"
                            onClick={() => setRoleFilter(role)}
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
                            {loading ? (
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
                                filteredUsers.slice(0, 100).map((user, idx) => (
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
                                                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
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
                            disabled={loading}
                        >
                            {loading ? 'Restricting...' : 'Apply Restriction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Detail Modal */}
            <Dialog open={!!selectedUser && !suspendDialogOpen} onOpenChange={() => setSelectedUser(null)}>
                <DialogContent className="bg-[#0a0a0c] border-zinc-800 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-rose-500" />
                            User Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
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

                            {/* Regular Roles */}
                            <div className="p-3 rounded-xl bg-zinc-900/50">
                                <p className="text-xs text-zinc-500 uppercase mb-2">Regular Roles</p>
                                <div className="flex gap-2 flex-wrap">
                                    {getUserRoles(selectedUser).map((role) => (
                                        <Badge key={role} className={`${getRoleBadge(role)} border capitalize`}>
                                            {role}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Admin Roles */}
                            {selectedUser.admin_roles && selectedUser.admin_roles.length > 0 && (
                                <div className="p-3 rounded-xl bg-zinc-900/50">
                                    <p className="text-xs text-zinc-500 uppercase mb-2">Admin Roles</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {selectedUser.admin_roles.map((role) => (
                                            <Badge key={role} className={`${getRoleBadge(role, true)} border capitalize`}>
                                                {role.replace('_', ' ')}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

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
