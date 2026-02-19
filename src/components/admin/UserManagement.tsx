import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Search,
  Filter,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Eye,
  Ban,
  UserCheck,
  UserX,
  MessageSquare,
  DollarSign,
  Trophy,
  Building2,
  UserPlus,
  UserMinus,
  Crown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { auditLog } from '@/lib/auditLog';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ROLE_PERMISSIONS } from '@/hooks/useAdminPermissions';

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  is_admin?: boolean;
  admin_roles?: string[];
  created_at: string;
  last_sign_in?: string;
  is_verified: boolean;
  is_suspended: boolean;
  is_banned: boolean;
  suspension_reason?: string;
  ban_reason?: string;
  suspension_until?: string;
  profile_data?: any;
  stats?: {
    tournaments_played: number;
    tournaments_won: number;
    total_earnings: number;
    teams_created: number;
  };
  // Fetched roles
  assigned_user_roles?: string[];
  assigned_admin_roles?: string[];
}

type Role = {
  id: string;
  name: string;
  description: string;
  isAdmin?: boolean;
  roleKey?: string;
  roleId?: string | number;
};

const UserManagement: React.FC = () => {
  const { user: currentUser, profile } = useAuth();
  const admin = useAdmin();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showAssignRoleDialog, setShowAssignRoleDialog] = useState(false);
  const [showRevokeRoleDialog, setShowRevokeRoleDialog] = useState(false);
  const [selectedRoleForAction, setSelectedRoleForAction] = useState<string>('');
  const [roleActionLoading, setRoleActionLoading] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [actionDuration, setActionDuration] = useState('7');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  const isSuperAdmin = admin.roles.includes('super_admin');

  // Extra data for user details modal
  const [userVerifiedRoles, setUserVerifiedRoles] = useState<any[]>([]);
  const [userAssignedRoles, setUserAssignedRoles] = useState<any[]>([]);

  // Load roles for super admin role management
  useEffect(() => {
    if (!isSuperAdmin) return;

    const loadRoles = async () => {
      try {
        let adminRoles: any[] = [];

        try {
          const { data: rolesWithKey, error: errorWithKey } = await supabase
            .from('admin_roles')
            .select('id, key, name, description')
            .order('name');

          if (errorWithKey) {
            const errorMessage = errorWithKey?.message || String(errorWithKey) || '';
            const errorCode = errorWithKey?.code || '';
            const isColumnError = errorMessage.includes('column') && errorMessage.includes('key')
              || errorCode === '42703';

            if (isColumnError) {
              const { data: rolesWithoutKey } = await supabase
                .from('admin_roles')
                .select('id, name, description')
                .order('name');
              adminRoles = rolesWithoutKey || [];
            } else {
              adminRoles = [];
            }
          } else {
            adminRoles = rolesWithKey || [];
          }
        } catch (err) {
          adminRoles = [];
        }

        const regularRoles = [
          { id: 'organizer', name: 'organizer', description: 'Tournament Organizer' },
          { id: 'venue_owner', name: 'venue_owner', description: 'Venue Owner' },
          { id: 'casual', name: 'casual', description: 'Casual Player' }
        ];

        const allRoles = [
          ...adminRoles.map((role: any) => {
            const roleKey = role.key || role.name;
            return {
              id: role.key || role.id || role.name,
              name: role.name,
              description: role.description || '',
              isAdmin: true,
              roleKey: roleKey,
              roleId: role.id
            };
          }),
          ...regularRoles.map(role => ({ ...role, isAdmin: false }))
        ];

        setRoles(allRoles);
      } catch (err) {
        console.error('Error loading roles:', err);
      }
    };

    loadRoles();
  }, [isSuperAdmin]);

  useEffect(() => {
    const loadUserDetails = async () => {
      if (!showUserDetails || !selectedUser) return;
      try {
        const [vr, ur] = await Promise.all([
          supabase.from('verified_roles').select('role,status,is_active,reviewed_at').eq('user_id', selectedUser.id),
          supabase.from('user_roles').select('role,is_active,assigned_at').eq('user_id', selectedUser.id)
        ]);
        if (!vr.error && vr.data) setUserVerifiedRoles(vr.data);
        if (!ur.error && ur.data) setUserAssignedRoles(ur.data);
      } catch { }
    };
    loadUserDetails();
  }, [showUserDetails, selectedUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const from = (currentPage - 1) * itemsPerPage;
      const to = currentPage * itemsPerPage - 1;

      const buildQuery = (includeStatusFilter: boolean) => {
        let q = supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to);

        // Note: We'll filter by roles after fetching, since we need to check both
        // admin_roles array and user_roles table. For now, fetch all and filter client-side.
        // This is less efficient but more accurate for multi-role system.

        if (searchTerm) {
          q = q.or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }

        if (includeStatusFilter && filterStatus !== 'all') {
          if (filterStatus === 'suspended') {
            q = q.eq('is_suspended', true);
          } else if (filterStatus === 'banned') {
            q = q.eq('is_banned', true);
          } else if (filterStatus === 'active') {
            q = q.eq('is_suspended', false).eq('is_banned', false);
          }
        }

        return q;
      };

      // First try with status filters applied
      let { data, error, count } = await buildQuery(true);

      // If the error is due to missing columns, retry without status filters
      if (error) {
        console.warn('Primary users query failed, retrying without status filter:', error.message);
        const retry = await buildQuery(false);
        const r = await retry;
        data = r.data;
        error = r.error;
        count = r.count;
      }

      if (error) throw error;

      // Fetch roles for all users
      const userIds = (data || []).map(u => u.id);
      const [userRolesResult, adminUserRolesResult] = await Promise.all([
        userIds.length > 0
          ? supabase.from('user_roles').select('user_id, role').in('user_id', userIds).eq('is_active', true)
          : { data: [], error: null },
        userIds.length > 0
          ? supabase.from('admin_user_roles').select('user_id, admin_roles:role_id(name)').in('user_id', userIds)
          : { data: [], error: null }
      ]);

      // Build role maps
      const userRolesMap: Record<string, string[]> = {};
      (userRolesResult.data || []).forEach((ur: any) => {
        if (!userRolesMap[ur.user_id]) userRolesMap[ur.user_id] = [];
        userRolesMap[ur.user_id].push(ur.role);
      });

      const adminRolesMap: Record<string, string[]> = {};
      (adminUserRolesResult.data || []).forEach((aur: any) => {
        if (!adminRolesMap[aur.user_id]) adminRolesMap[aur.user_id] = [];
        const roleName = aur.admin_roles?.name || '';
        if (roleName) {
          adminRolesMap[aur.user_id].push(roleName.toLowerCase().replace(/\s+/g, '_'));
        }
      });

      // Enhance users with role data
      let usersWithRoles = (data || []).map(user => ({
        ...user,
        assigned_user_roles: userRolesMap[user.id] || [],
        assigned_admin_roles: adminRolesMap[user.id] || (user.admin_roles as string[]) || []
      }));

      // Apply role filter client-side (since we need to check multiple sources)
      if (filterRole !== 'all') {
        const adminRoles = ['super_admin', 'ops_admin', 'finance_admin', 'moderator', 'support_admin'];
        const normalizedFilterRole = filterRole.toLowerCase().replace(/\s+/g, '_');

        usersWithRoles = usersWithRoles.filter(user => {
          // Check admin roles
          if (adminRoles.includes(normalizedFilterRole)) {
            return user.assigned_admin_roles?.includes(normalizedFilterRole) ||
              (user.admin_roles as string[])?.includes(normalizedFilterRole);
          }
          // Check user roles
          return user.assigned_user_roles?.includes(normalizedFilterRole) ||
            user.role === normalizedFilterRole;
        });
      }

      setUsers(usersWithRoles);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filterRole, filterStatus, searchTerm]);

  const handleSuspendUser = async () => {
    if (!selectedUser || !actionReason) return;

    try {
      const suspensionUntil = new Date();
      suspensionUntil.setDate(suspensionUntil.getDate() + parseInt(actionDuration));

      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: true,
          suspension_reason: actionReason,
          suspension_until: suspensionUntil.toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Log the action
      await auditLog.log('suspend', 'user', selectedUser.id, selectedUser.username, {
        reason: actionReason,
        duration: actionDuration,
        until: suspensionUntil.toISOString()
      });

      toast({
        title: 'User Suspended',
        description: `${selectedUser.username} has been suspended for ${actionDuration} days`,
        variant: 'default',
      });

      setShowSuspendDialog(false);
      setActionReason('');
      fetchUsers();

    } catch (error) {
      console.error('Error suspending user:', error);
      toast({
        title: 'Error',
        description: 'Failed to suspend user',
        variant: 'destructive',
      });
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !actionReason) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: true,
          ban_reason: actionReason,
          is_suspended: false // Remove suspension if banned
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Log the action
      await auditLog.log('ban', 'user', selectedUser.id, selectedUser.username, {
        reason: actionReason
      });

      toast({
        title: 'User Banned',
        description: `${selectedUser.username} has been permanently banned`,
        variant: 'default',
      });

      setShowBanDialog(false);
      setActionReason('');
      fetchUsers();

    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: 'Error',
        description: 'Failed to ban user',
        variant: 'destructive',
      });
    }
  };

  const handleUnsuspendUser = async (userId: string, username: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: false,
          suspension_reason: null,
          suspension_until: null
        })
        .eq('id', userId);

      if (error) throw error;

      // Log the action
      await auditLog.log('unsuspend', 'user', userId, username);

      toast({
        title: 'User Unsuspended',
        description: `${username} has been unsuspended`,
        variant: 'default',
      });

      fetchUsers();

    } catch (error) {
      console.error('Error unsuspending user:', error);
      toast({
        title: 'Error',
        description: 'Failed to unsuspend user',
        variant: 'destructive',
      });
    }
  };

  const handleUnbanUser = async (userId: string, username: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: false,
          ban_reason: null
        })
        .eq('id', userId);

      if (error) throw error;

      // Log the action
      await auditLog.log('unban', 'user', userId, username);

      toast({
        title: 'User Unbanned',
        description: `${username} has been unbanned`,
        variant: 'default',
      });

      fetchUsers();

    } catch (error) {
      console.error('Error unbanning user:', error);
      toast({
        title: 'Error',
        description: 'Failed to unban user',
        variant: 'destructive',
      });
    }
  };

  // Audit logging now handled by centralized auditLog utility

  // Role management functions (for super admin)
  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRoleForAction) return;

    try {
      setRoleActionLoading(true);
      const user = {
        id: selectedUser.id,
        email: selectedUser.email,
        is_admin: selectedUser.is_admin,
        admin_roles: selectedUser.admin_roles || selectedUser.assigned_admin_roles
      };
      const targetUserIsSuperAdmin = user.is_admin && (user.admin_roles as string[])?.includes('super_admin');
      const selectedRoleData = roles.find(r => r.id === selectedRoleForAction);
      const roleDisplayName = selectedRoleData?.name || selectedRoleForAction.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const isAdminRole = selectedRoleData?.isAdmin || false;

      if (targetUserIsSuperAdmin) {
        toast({ title: 'Cannot Assign Role', description: 'Super admins cannot have roles assigned.', variant: 'destructive' });
        setRoleActionLoading(false);
        return;
      }

      if (selectedRoleForAction === 'super_admin' || selectedRoleData?.roleKey === 'super_admin') {
        toast({ title: 'Cannot Assign Role', description: 'Super admin role cannot be assigned through this interface.', variant: 'destructive' });
        setRoleActionLoading(false);
        return;
      }

      if (isAdminRole) {
        const roleData = selectedRoleData as (Role & { roleKey?: string; roleId?: string | number });
        let roleId: string | number;
        let roleKey: string;

        if (roleData?.roleId) {
          roleId = roleData.roleId;
          const rawKey = roleData.roleKey || roleData.name || selectedRoleForAction;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
        } else {
          const { data: adminRoleRecord, error: roleLookupError } = await supabase
            .from('admin_roles')
            .select('id, key, name')
            .or(`id.eq.${selectedRoleForAction},key.eq.${selectedRoleForAction},name.eq.${selectedRoleForAction}`)
            .maybeSingle();

          if (roleLookupError || !adminRoleRecord) {
            throw new Error(`Admin role '${selectedRoleForAction}' not found`);
          }

          const rawKey = adminRoleRecord.key || adminRoleRecord.name || selectedRoleForAction;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
          roleId = adminRoleRecord.id;
        }

        const { data: existingRole } = await supabase
          .from('admin_user_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('role_id', roleId)
          .maybeSingle();

        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('admin_roles')
          .eq('id', user.id)
          .maybeSingle();

        const currentAdminRoles = (currentProfile?.admin_roles as string[]) || [];
        if (existingRole || currentAdminRoles.includes(roleKey)) {
          toast({ title: 'Role Already Assigned', description: `${roleDisplayName} is already assigned`, variant: 'default' });
          setRoleActionLoading(false);
          return;
        }

        const { error: adminError } = await supabase
          .from('admin_user_roles')
          .insert({
            user_id: user.id,
            role_id: roleId,
            assigned_by: profile?.id,
            assigned_at: new Date().toISOString()
          });

        if (adminError) {
          if (adminError.code === '23505') {
            toast({ title: 'Role Already Assigned', description: `${roleDisplayName} is already assigned`, variant: 'default' });
            setRoleActionLoading(false);
            return;
          }
          throw adminError;
        }

        const updatedAdminRoles = [...currentAdminRoles, roleKey];
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_admin: true, admin_roles: updatedAdminRoles })
          .eq('id', user.id);

        if (profileError) throw profileError;
      } else {
        const { error: userRoleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: selectedRoleForAction,
            is_active: true,
            assigned_by: profile?.id,
            assigned_at: new Date().toISOString()
          });

        if (userRoleError) {
          const { error: updateError } = await supabase
            .from('user_roles')
            .update({ is_active: true, assigned_by: profile?.id, assigned_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('role', selectedRoleForAction);
          if (updateError) throw updateError;
        }
      }

      toast({ title: 'Role Assigned', description: `${roleDisplayName} assigned to ${user.email}` });
      window.dispatchEvent(new CustomEvent('adminRolesUpdated'));
      localStorage.setItem('admin_roles_updated', Date.now().toString());

      setShowAssignRoleDialog(false);
      setSelectedRoleForAction('');
      fetchUsers();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to assign role', variant: 'destructive' });
    } finally {
      setRoleActionLoading(false);
    }
  };

  const handleRevokeRole = async () => {
    if (!selectedUser || !selectedRoleForAction) return;

    try {
      setRoleActionLoading(true);
      const user = {
        id: selectedUser.id,
        email: selectedUser.email,
        is_admin: selectedUser.is_admin,
        admin_roles: selectedUser.admin_roles || selectedUser.assigned_admin_roles
      };
      const targetUserIsSuperAdmin = user.is_admin && (user.admin_roles as string[])?.includes('super_admin');

      if (targetUserIsSuperAdmin) {
        toast({ title: 'Cannot Revoke Role', description: 'Super admins do not have roles assigned.', variant: 'destructive' });
        setRoleActionLoading(false);
        return;
      }

      const selectedRoleData = roles.find(r => r.id === selectedRoleForAction);
      const roleDisplayName = selectedRoleData?.name || selectedRoleForAction.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const isAdminRole = selectedRoleData?.isAdmin || false;

      if (selectedRoleForAction === 'super_admin' || selectedRoleData?.roleKey === 'super_admin') {
        toast({ title: 'Cannot Revoke Role', description: 'Super admin role cannot be revoked.', variant: 'destructive' });
        setRoleActionLoading(false);
        return;
      }

      if (isAdminRole) {
        const roleData = selectedRoleData as (Role & { roleKey?: string; roleId?: string | number });
        let roleId: string | number;
        let roleKey: string;

        if (roleData?.roleId) {
          roleId = roleData.roleId;
          const rawKey = roleData.roleKey || roleData.name || selectedRoleForAction;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
        } else {
          const { data: adminRoleRecord, error: roleLookupError } = await supabase
            .from('admin_roles')
            .select('id, key, name')
            .or(`id.eq.${selectedRoleForAction},key.eq.${selectedRoleForAction},name.eq.${selectedRoleForAction}`)
            .maybeSingle();

          if (roleLookupError || !adminRoleRecord) {
            throw new Error(`Admin role '${selectedRoleForAction}' not found`);
          }

          const rawKey = adminRoleRecord.key || adminRoleRecord.name || selectedRoleForAction;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
          roleId = adminRoleRecord.id;
        }

        const { data: existingAdminRole } = await supabase
          .from('admin_user_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('role_id', roleId)
          .maybeSingle();

        if (!existingAdminRole) {
          toast({ title: 'Role Not Found', description: `${roleDisplayName} is not assigned to ${user.email}`, variant: 'destructive' });
          setRoleActionLoading(false);
          return;
        }

        const { error: adminError } = await supabase
          .from('admin_user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('role_id', roleId);

        if (adminError) throw adminError;

        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('admin_roles')
          .eq('id', user.id)
          .maybeSingle();

        const currentAdminRoles = (currentProfile?.admin_roles as string[]) || [];
        const updatedAdminRoles = currentAdminRoles.filter(r => r !== roleKey);

        const { data: remainingAdminRoles } = await supabase
          .from('admin_user_roles')
          .select('id')
          .eq('user_id', user.id);

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            is_admin: remainingAdminRoles && remainingAdminRoles.length > 0,
            admin_roles: updatedAdminRoles
          })
          .eq('id', user.id);

        if (profileError) throw profileError;
      } else {
        const { data: existingUserRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('role', selectedRoleForAction)
          .eq('is_active', true)
          .maybeSingle();

        if (!existingUserRole) {
          toast({ title: 'Role Not Found', description: `${roleDisplayName} is not active for ${user.email}`, variant: 'destructive' });
          setRoleActionLoading(false);
          return;
        }

        const { error: userRoleError } = await supabase
          .from('user_roles')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('role', selectedRoleForAction);

        if (userRoleError) throw userRoleError;
      }

      toast({ title: 'Role Revoked', description: `${roleDisplayName} revoked from ${user.email}` });
      window.dispatchEvent(new CustomEvent('adminRolesUpdated'));
      localStorage.setItem('admin_roles_updated', Date.now().toString());

      setShowRevokeRoleDialog(false);
      setSelectedRoleForAction('');
      fetchUsers();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to revoke role', variant: 'destructive' });
    } finally {
      setRoleActionLoading(false);
    }
  };

  const getStatusBadge = (user: User) => {
    if (user.is_banned) {
      return <Badge className="bg-red-600 text-white">Banned</Badge>;
    }
    if (user.is_suspended) {
      return <Badge className="bg-orange-600 text-white">Suspended</Badge>;
    }
    return <Badge className="bg-green-600 text-white">Active</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-600',
      super_admin: 'bg-yellow-600',
      ops_admin: 'bg-blue-600',
      finance_admin: 'bg-green-600',
      moderator: 'bg-orange-600',
      support_admin: 'bg-purple-500',
      organizer: 'bg-blue-600',
      venue_owner: 'bg-green-600',
      casual: 'bg-gray-600'
    };
    const displayName = role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return (
      <Badge className={`${colors[role] || 'bg-gray-600'} text-white`}>
        {displayName}
      </Badge>
    );
  };

  const getAllUserRoles = (user: User): string[] => {
    const allRoles: string[] = [];

    // Add admin roles
    if (user.assigned_admin_roles && user.assigned_admin_roles.length > 0) {
      allRoles.push(...user.assigned_admin_roles);
    } else if (user.admin_roles && user.admin_roles.length > 0) {
      allRoles.push(...(user.admin_roles as string[]));
    }

    // Add user roles
    if (user.assigned_user_roles && user.assigned_user_roles.length > 0) {
      allRoles.push(...user.assigned_user_roles);
    } else if (user.role && user.role !== 'casual') {
      // Only add legacy role if it's not casual (to avoid duplicates)
      allRoles.push(user.role);
    }

    // If no roles found, default to casual
    if (allRoles.length === 0) {
      allRoles.push('casual');
    }

    return [...new Set(allRoles)]; // Remove duplicates
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-gray-400">Manage users, handle disputes, and enforce platform policies</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full md:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all">All Roles</SelectItem>
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">Admin Roles</div>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="ops_admin">Ops Admin</SelectItem>
                <SelectItem value="finance_admin">Finance Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="support_admin">Support Admin</SelectItem>
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase mt-2 border-t border-gray-600 pt-2">User Roles</div>
                <SelectItem value="organizer">Organizer</SelectItem>
                <SelectItem value="venue_owner">Venue Owner</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">User</TableHead>
                <TableHead className="text-gray-300">Role</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Stats</TableHead>
                <TableHead className="text-gray-300">Joined</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="border-gray-700 hover:bg-gray-700/30">
                    <TableCell className="text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full" />
                          ) : (
                            <User className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{user.full_name || user.username}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getAllUserRoles(user).map((role, idx) => (
                          <span key={idx}>
                            {getRoleBadge(role)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user)}
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-yellow-400" />
                          {user.stats?.tournaments_won || 0} wins
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-green-400" />
                          ${user.stats?.total_earnings || 0}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label="View details"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserDetails(true);
                              }}
                              className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View details</TooltipContent>
                        </Tooltip>

                        {/* Super Admin Role Management Actions */}
                        {isSuperAdmin && (user.is_admin || user.assigned_admin_roles?.length || 0 > 0) && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  aria-label="Assign role"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowAssignRoleDialog(true);
                                  }}
                                  className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Assign Role</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  aria-label="Revoke role"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowRevokeRoleDialog(true);
                                  }}
                                  className="border-red-600 text-red-400 hover:bg-red-600/10"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Revoke Role</TooltipContent>
                            </Tooltip>
                          </>
                        )}

                        {!user.is_banned && !user.is_suspended && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  aria-label="Suspend user"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowSuspendDialog(true);
                                  }}
                                  className="border-orange-600 text-orange-400 hover:bg-orange-600/10"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Suspend</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  aria-label="Ban user"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowBanDialog(true);
                                  }}
                                  className="border-red-600 text-red-400 hover:bg-red-600/10"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ban</TooltipContent>
                            </Tooltip>
                          </>
                        )}

                        {user.is_suspended && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label="Unsuspend user"
                                onClick={() => handleUnsuspendUser(user.id, user.username)}
                                className="border-green-600 text-green-400 hover:bg-green-600/10"
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Unsuspend</TooltipContent>
                          </Tooltip>
                        )}

                        {user.is_banned && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label="Unban user"
                                onClick={() => handleUnbanUser(user.id, user.username)}
                                className="border-green-600 text-green-400 hover:bg-green-600/10"
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Unban</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Previous
          </Button>

          <span className="text-gray-400">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Next
          </Button>
        </div>
      )}

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Suspend User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Suspend {selectedUser?.username} for violating platform policies
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="duration" className="text-white">Duration (days)</Label>
              <Select value={actionDuration} onValueChange={setActionDuration}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason" className="text-white">Reason for suspension</Label>
              <Textarea
                id="reason"
                placeholder="Explain why this user is being suspended..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSuspendDialog(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSuspendUser}
              disabled={!actionReason}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Suspend User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Ban User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Permanently ban {selectedUser?.username} from the platform
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="ban-reason" className="text-white">Reason for ban</Label>
              <Textarea
                id="ban-reason"
                placeholder="Explain why this user is being banned..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBanDialog(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBanUser}
              disabled={!actionReason}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white">User Details</DialogTitle>
            <DialogDescription className="text-gray-400">Profile and roles</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400">Name</div>
                  <div className="text-white">{selectedUser.full_name || selectedUser.username}</div>
                </div>
                <div>
                  <div className="text-gray-400">Email</div>
                  <div className="text-white">{selectedUser.email}</div>
                </div>
                <div>
                  <div className="text-gray-400">Role</div>
                  <div className="text-white">{selectedUser.role}</div>
                </div>
                <div>
                  <div className="text-gray-400">Joined</div>
                  <div className="text-white">{new Date(selectedUser.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              <div>
                <div className="text-gray-400 mb-1">Verified Roles</div>
                <div className="flex flex-wrap gap-2">
                  {userVerifiedRoles.length ? userVerifiedRoles.map((r) => {
                    const role = r.role as string;
                    const status = (r.status as string) || '';
                    const isActive = !!r.is_active;
                    const label = isActive ? `${role}: ${status}` : `${role}: revoked`;
                    const cls = !isActive
                      ? 'bg-gray-600'
                      : status === 'approved'
                        ? 'bg-green-600'
                        : status === 'pending'
                          ? 'bg-yellow-600'
                          : status === 'rejected'
                            ? 'bg-red-600'
                            : 'bg-gray-600';
                    return (
                      <Badge key={`${role}-vr`} className={`${cls} text-white`}>
                        {label}
                      </Badge>
                    );
                  }) : <div className="text-gray-500">None</div>}
                </div>
              </div>

              <div>
                <div className="text-gray-400 mb-1">Assigned Roles</div>
                <div className="flex flex-wrap gap-2">
                  {userAssignedRoles.length ? userAssignedRoles.map((r) => (
                    <Badge key={`${r.role}-ur`} className="bg-blue-600 text-white">
                      {r.role}: {r.is_active ? 'active' : 'inactive'}
                    </Badge>
                  )) : <div className="text-gray-500">None</div>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Role Dialog */}
      {selectedUser && (
        <Dialog open={showAssignRoleDialog} onOpenChange={setShowAssignRoleDialog}>
          <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Assign Role to {selectedUser.username}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Select a role to assign to {selectedUser.email}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Select value={selectedRoleForAction} onValueChange={setSelectedRoleForAction}>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select role to assign" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">Admin Roles</div>
                  {roles.filter(r => r.isAdmin && r.roleKey !== 'super_admin').map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase mt-2 border-t border-gray-700 pt-2">User Roles</div>
                  {roles.filter(r => !r.isAdmin).map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignRoleDialog(false)} className="text-gray-400 border-gray-600 hover:bg-gray-700">
                Cancel
              </Button>
              <Button onClick={handleAssignRole} disabled={!selectedRoleForAction || roleActionLoading} className="bg-green-600 hover:bg-green-700 text-white">
                {roleActionLoading ? 'Assigning...' : 'Assign Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Revoke Role Dialog */}
      {selectedUser && (
        <Dialog open={showRevokeRoleDialog} onOpenChange={setShowRevokeRoleDialog}>
          <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <UserMinus className="w-5 h-5" /> Revoke Role from {selectedUser.username}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Select a role to revoke from {selectedUser.email}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Select value={selectedRoleForAction} onValueChange={setSelectedRoleForAction}>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select role to revoke" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">Admin Roles</div>
                  {selectedUser && getAllUserRoles(selectedUser)
                    .filter(role => {
                      const roleData = roles.find(r => r.id === role || r.roleKey === role);
                      return roleData?.isAdmin && roleData.roleKey !== 'super_admin';
                    })
                    .map(role => {
                      const roleData = roles.find(r => r.id === role || r.roleKey === role);
                      return roleData ? (
                        <SelectItem key={role} value={roleData.id}>{roleData.name}</SelectItem>
                      ) : null;
                    })}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase mt-2 border-t border-gray-700 pt-2">User Roles</div>
                  {selectedUser && getAllUserRoles(selectedUser)
                    .filter(role => {
                      const roleData = roles.find(r => r.id === role || r.roleKey === role);
                      return !roleData?.isAdmin;
                    })
                    .map(role => {
                      const roleData = roles.find(r => r.id === role || r.roleKey === role);
                      return roleData ? (
                        <SelectItem key={role} value={roleData.id}>{roleData.name}</SelectItem>
                      ) : null;
                    })}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRevokeRoleDialog(false)} className="text-gray-400 border-gray-600 hover:bg-gray-700">
                Cancel
              </Button>
              <Button onClick={handleRevokeRole} disabled={!selectedRoleForAction || roleActionLoading} className="bg-red-600 hover:bg-red-700 text-white">
                {roleActionLoading ? 'Revoking...' : 'Revoke Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UserManagement;
