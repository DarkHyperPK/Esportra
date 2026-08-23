import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAdminRoleDefinitions, useAdminUserRoleAssignments, adminKeys } from '@/hooks/useAdminQueries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Search,
  Filter,
  Shield,
  UserPlus,
  UserMinus,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandSection,
  CommandToolbar,
} from '@/components/management/CommandSurface';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_admin: boolean;
  admin_roles: string[];
  created_at: string;
  assigned_roles: Array<{
    role_id: string | number;
    role_name: string;
    assigned_at: string;
    assigned_by: string;
  }>;
}

type Role = {
  id: string;
  name: string;
  description: string;
  isAdmin?: boolean;
  roleKey?: string;
  roleId?: string | number;
};

const AdminRoleManagement: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const admin = useAdmin();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  // Check if current user can manage admins
  const isSuperAdmin = admin.roles.includes('super_admin');
  const canManageAdmins = isSuperAdmin || admin.hasPermission('system:settings');

  // Queries
  const { data: adminRolesData } = useAdminRoleDefinitions();
  const { data: allRoleAssignments } = useAdminUserRoleAssignments();
  const adminUsersKey = [...adminKeys.all, 'admin-users'] as const;
  const { data: adminProfiles, isLoading } = useQuery({
    queryKey: adminUsersKey,
    queryFn: () => apiClient.get<any[]>('/api/admin/users?is_admin=true&order=created_at.desc'),
    enabled: canManageAdmins,
    staleTime: 1000 * 30,
  });

  // Derived data
  const roles: Role[] = useMemo(() => {
    const mapped = (adminRolesData || []).map((role: any) => {
      const roleKey = role.key || role.name;
      return {
        id: role.key || role.id || role.name,
        name: role.name,
        description: role.description || '',
        isAdmin: true,
        roleKey,
        roleId: role.id
      };
    });
    const regularRoles = [
      { id: 'organizer', name: 'organizer', description: 'Tournament Organizer', isAdmin: false },
      { id: 'venue_owner', name: 'venue_owner', description: 'Venue Owner', isAdmin: false },
      { id: 'casual', name: 'casual', description: 'Casual Player', isAdmin: false }
    ];
    return [...mapped, ...regularRoles] as Role[];
  }, [adminRolesData]);

  const admins: AdminUser[] = useMemo(() => {
    if (!adminProfiles) return [];
    return adminProfiles.map((adminUser: any) => {
      const userRoles = (allRoleAssignments || []).filter((ur: any) => ur.user_id === adminUser.id);
      const assignedRoles = userRoles.map((ur: any) => ({
        role_id: ur.role_id,
        role_name: ur.admin_roles?.name || ur.role_name || 'Unknown',
        assigned_at: ur.assigned_at,
        assigned_by: ur.assigned_by
      }));
      return { ...adminUser, assigned_roles: assignedRoles };
    });
  }, [adminProfiles, allRoleAssignments]);

  const invalidateAdminData = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.adminUserRoles() });
    queryClient.invalidateQueries({ queryKey: adminUsersKey });
  };

  // Mutations
  const assignMutation = useMutation({
    mutationFn: async ({ user, selectedRoleId, roleData, roleDisplayName, isAdminRole }: {
      user: { id: string; email: string; is_admin: boolean; admin_roles: string[] };
      selectedRoleId: string;
      roleData: Role | undefined;
      roleDisplayName: string;
      isAdminRole: boolean;
    }): Promise<{ roleDisplayName: string; userEmail: string } | null> => {
      if (isAdminRole) {
        const typedRoleData = roleData as (Role & { roleKey?: string; roleId?: string | number });
        let roleId: string | number;
        let roleKey: string;

        if (typedRoleData?.roleId) {
          roleId = typedRoleData.roleId;
          const rawKey = typedRoleData.roleKey || typedRoleData.name || selectedRoleId;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
        } else {
          let adminRoleRecord: any = null;
          try {
            adminRoleRecord = await apiClient.get<any>(`/api/admin/roles?or=(id.eq.${selectedRoleId},key.eq.${selectedRoleId},name.eq.${selectedRoleId})`);
          } catch {
            // not found
          }

          if (!adminRoleRecord) {
            throw new Error(`Admin role '${selectedRoleId}' not found`);
          }

          const rawKey = adminRoleRecord.key || adminRoleRecord.name || selectedRoleId;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
          roleId = adminRoleRecord.id;
        }

        let existingRole: any = null;
        try {
          existingRole = await apiClient.get<any>(`/api/admin/admin-user-roles?user_id=${user.id}&role_id=${roleId}`);
        } catch {
          // not found
        }

        let currentProfile: any = null;
        try {
          currentProfile = await apiClient.get<any>(`/api/profiles/${user.id}`);
        } catch {
          // not found
        }

        const currentAdminRoles = (currentProfile?.admin_roles as string[]) || [];
        if (existingRole || currentAdminRoles.includes(roleKey)) {
          toast({ title: 'Role Already Assigned', description: `${roleDisplayName} is already assigned`, variant: 'default' });
          return null;
        }

        try {
          await apiClient.post('/api/admin/admin-user-roles', {
            user_id: user.id,
            role_id: roleId,
            assigned_by: profile?.id,
            assigned_at: new Date().toISOString()
          });
        } catch (err: any) {
          if (err?.body?.code === '23505' || err?.status === 409) {
            toast({ title: 'Role Already Assigned', description: `${roleDisplayName} is already assigned`, variant: 'default' });
            return null;
          }
          throw err;
        }

        const updatedAdminRoles = [...currentAdminRoles, roleKey];
        await apiClient.put(`/api/admin/users/${user.id}`, { isAdmin: true, adminRoles: updatedAdminRoles });
      } else {
        try {
          await apiClient.post('/api/admin/user-roles', {
            user_id: user.id,
            role: selectedRoleId,
            is_active: true,
            assigned_by: profile?.id,
            assigned_at: new Date().toISOString()
          });
        } catch {
          await apiClient.put('/api/admin/user-roles', {
            user_id: user.id,
            role: selectedRoleId,
            is_active: true,
            assigned_by: profile?.id,
            assigned_at: new Date().toISOString()
          });
        }
      }

      return { roleDisplayName, userEmail: user.email };
    },
    onSuccess: (result) => {
      if (!result) return;
      toast({ title: 'Role Assigned', description: `${result.roleDisplayName} assigned to ${result.userEmail}` });
      window.dispatchEvent(new CustomEvent('adminRolesUpdated'));
      localStorage.setItem('admin_roles_updated', Date.now().toString());
      invalidateAdminData();
      setShowAssignDialog(false);
      setSelectedRole('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to assign role', variant: 'destructive' });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ user, selectedRoleId, roleData, roleDisplayName, isAdminRole }: {
      user: { id: string; email: string; is_admin: boolean; admin_roles: string[] };
      selectedRoleId: string;
      roleData: Role | undefined;
      roleDisplayName: string;
      isAdminRole: boolean;
    }): Promise<{ roleDisplayName: string; userEmail: string } | null> => {
      if (isAdminRole) {
        const typedRoleData = roleData as (Role & { roleKey?: string; roleId?: string | number });
        let roleId: string | number;
        let roleKey: string;

        if (typedRoleData?.roleId) {
          roleId = typedRoleData.roleId;
          const rawKey = typedRoleData.roleKey || typedRoleData.name || selectedRoleId;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
        } else {
          let adminRoleRecord: any = null;
          try {
            adminRoleRecord = await apiClient.get<any>(`/api/admin/roles?or=(id.eq.${selectedRoleId},key.eq.${selectedRoleId},name.eq.${selectedRoleId})`);
          } catch {
            // not found
          }

          if (!adminRoleRecord) {
            throw new Error(`Admin role '${selectedRoleId}' not found`);
          }

          const rawKey = adminRoleRecord.key || adminRoleRecord.name || selectedRoleId;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
          roleId = adminRoleRecord.id;
        }

        let existingAdminRole: any = null;
        try {
          existingAdminRole = await apiClient.get<any>(`/api/admin/admin-user-roles?user_id=${user.id}&role_id=${roleId}`);
        } catch {
          // not found
        }

        if (!existingAdminRole) {
          toast({ title: 'Role Not Found', description: `${roleDisplayName} is not assigned to ${user.email}`, variant: 'destructive' });
          return null;
        }

        await apiClient.delete(`/api/admin/admin-user-roles?user_id=${user.id}&role_id=${roleId}`);

        let currentProfile: any = null;
        try {
          currentProfile = await apiClient.get<any>(`/api/profiles/${user.id}`);
        } catch {
          // not found
        }

        const currentAdminRoles = (currentProfile?.admin_roles as string[]) || [];
        const updatedAdminRoles = currentAdminRoles.filter(r => r !== roleKey);

        let remainingAdminRoles: any[] = [];
        try {
          remainingAdminRoles = await apiClient.get<any[]>(`/api/admin/admin-user-roles?user_id=${user.id}`);
        } catch {
          remainingAdminRoles = [];
        }

        await apiClient.put(`/api/admin/users/${user.id}`, {
          isAdmin: remainingAdminRoles && remainingAdminRoles.length > 0,
          adminRoles: updatedAdminRoles
        });
      } else {
        let existingUserRole: any = null;
        try {
          const results = await apiClient.get<any[]>(`/api/admin/user-roles?user_id=${user.id}&role=${selectedRoleId}&is_active=true`);
          existingUserRole = results?.[0] || null;
        } catch {
          // not found
        }

        if (!existingUserRole) {
          toast({ title: 'Role Not Found', description: `${roleDisplayName} is not active for ${user.email}`, variant: 'destructive' });
          return null;
        }

        await apiClient.put('/api/admin/user-roles', {
          user_id: user.id,
          role: selectedRoleId,
          is_active: false
        });
      }

      return { roleDisplayName, userEmail: user.email };
    },
    onSuccess: (result) => {
      if (!result) return;
      toast({ title: 'Role Revoked', description: `${result.roleDisplayName} revoked from ${result.userEmail}` });
      window.dispatchEvent(new CustomEvent('adminRolesUpdated'));
      localStorage.setItem('admin_roles_updated', Date.now().toString());
      invalidateAdminData();
      setShowRevokeDialog(false);
      setSelectedRole('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to revoke role', variant: 'destructive' });
    },
  });

  const actionLoading = assignMutation.isPending || revokeMutation.isPending;

  const handleAssignRole = () => {
    if (!selectedAdmin || !selectedRole) return;

    const user = { id: selectedAdmin.id, email: selectedAdmin.email, is_admin: selectedAdmin.is_admin, admin_roles: selectedAdmin.admin_roles };
    const targetUserIsSuperAdmin = user.is_admin && (user.admin_roles as string[])?.includes('super_admin');
    const selectedRoleData = roles.find(r => r.id === selectedRole);
    const roleDisplayName = selectedRoleData?.name || selectedRole.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const isAdminRole = selectedRoleData?.isAdmin || false;

    if (targetUserIsSuperAdmin) {
      toast({ title: 'Cannot Assign Role', description: 'Super admins cannot have roles assigned.', variant: 'destructive' });
      return;
    }

    if (selectedRole === 'super_admin' || selectedRoleData?.roleKey === 'super_admin') {
      toast({ title: 'Cannot Assign Role', description: 'Super admin role cannot be assigned through this interface.', variant: 'destructive' });
      return;
    }

    assignMutation.mutate({ user, selectedRoleId: selectedRole, roleData: selectedRoleData, roleDisplayName, isAdminRole });
  };

  const handleRevokeRole = () => {
    if (!selectedAdmin || !selectedRole) return;

    const user = { id: selectedAdmin.id, email: selectedAdmin.email, is_admin: selectedAdmin.is_admin, admin_roles: selectedAdmin.admin_roles };
    const targetUserIsSuperAdmin = user.is_admin && (user.admin_roles as string[])?.includes('super_admin');

    if (targetUserIsSuperAdmin) {
      toast({ title: 'Cannot Revoke Role', description: 'Super admins do not have roles assigned.', variant: 'destructive' });
      return;
    }

    const selectedRoleData = roles.find(r => r.id === selectedRole);
    const roleDisplayName = selectedRoleData?.name || selectedRole.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const isAdminRole = selectedRoleData?.isAdmin || false;

    if (selectedRole === 'super_admin' || selectedRoleData?.roleKey === 'super_admin') {
      toast({ title: 'Cannot Revoke Role', description: 'Super admin role cannot be revoked.', variant: 'destructive' });
      return;
    }

    revokeMutation.mutate({ user, selectedRoleId: selectedRole, roleData: selectedRoleData, roleDisplayName, isAdminRole });
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch =
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' ||
      admin.admin_roles?.includes(filterRole) ||
      admin.assigned_roles.some(r => r.role_name.toLowerCase().replace(/\s+/g, '_') === filterRole);

    return matchesSearch && matchesRole;
  });

  if (!canManageAdmins) {
    return (
      <AdminPage eyebrow="Security" title="Admin Roles" description="Manage admin roles and permissions">
        <CommandSection>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertTriangle className="h-4 w-4 text-red-300" />
            <h3 className="mt-3 text-lg font-semibold text-white">Access Denied</h3>
            <p className="mt-1 text-sm text-zinc-500">Only Super Admins can access this page.</p>
          </div>
        </CommandSection>
      </AdminPage>
    );
  }

  return (
    <AdminPage eyebrow="Security" title="Admin Roles" description="Manage admin roles and permissions">
      <div className="space-y-5">
        {/* Filters */}
        <CommandToolbar>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              <input
                placeholder="Search admins by email, username, or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-none border border-white/10 bg-[#0a0a0c]/90 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full rounded-none border-white/10 bg-[#0a0a0c]/90 text-xs text-white focus:ring-rose-500/20 md:w-48">
                <Filter className="mr-2 h-3.5 w-3.5" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-white/10 bg-[#0a0a0c] text-white">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                {roles.filter(r => r.isAdmin && (r as any).roleKey !== 'super_admin').map(r => (
                  <SelectItem key={r.id} value={(r as any).roleKey || r.name}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CommandToolbar>

        {/* Admins Table */}
        <CommandSection className="p-0">
          <div className="flex items-center gap-2 border-b border-white/5 px-5 py-4">
            <Shield className="h-4 w-4 text-rose-400" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Admin Users ({filteredAdmins.length})</span>
          </div>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-zinc-500">Loading admins...</div>
          ) : filteredAdmins.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">No admins found</div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <table className="w-full min-w-[880px] text-left text-xs">
                <thead className="bg-black/40 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Roles</th>
                    <th className="px-4 py-3">Permissions</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAdmins.map((admin) => {
                    const isSuperAdminUser = admin.admin_roles?.includes('super_admin');
                    const displayRoles = admin.assigned_roles.length > 0
                      ? admin.assigned_roles.map(r => r.role_name)
                      : (admin.admin_roles || []);

                    return (
                      <tr key={admin.id} className="text-zinc-300 transition-colors hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-white">{admin.full_name || admin.username}</div>
                            <div className="text-xs text-zinc-500">{admin.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {isSuperAdminUser ? (
                              <span className="flex items-center gap-1 border border-rose-500/30 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-rose-400">
                                <Crown className="h-3 w-3" />
                                Super Admin
                              </span>
                            ) : (
                              displayRoles.map((role, idx) => (
                                <span key={idx} className="border border-white/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-200">
                                  {role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isSuperAdminUser ? (
                            <span className="border border-rose-500/30 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-rose-400">
                              All Permissions
                            </span>
                          ) : (
                            <span className="text-xs tabular-nums text-zinc-500">
                              {admin.assigned_roles.length} role(s)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-zinc-400">
                          {new Date(admin.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {!isSuperAdminUser && (
                            <div className="flex justify-end gap-1.5">
                              <CommandButton
                                size="sm"
                                onClick={() => {
                                  setSelectedAdmin(admin);
                                  setShowAssignDialog(true);
                                }}
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                                Assign
                              </CommandButton>
                              <CommandButton
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  setSelectedAdmin(admin);
                                  setShowRevokeDialog(true);
                                }}
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                                Revoke
                              </CommandButton>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CommandSection>

        {/* Assign Role Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="rounded-none border-white/10 bg-[#0a0a0c] text-white">
            <DialogHeader>
              <DialogTitle>Assign Role to {selectedAdmin?.email}</DialogTitle>
              <DialogDescription className="text-zinc-500">
                Select a role to assign to this admin user.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Role</p>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="rounded-none border-white/10 bg-black/60 text-white focus:ring-rose-500/20">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-none border-white/10 bg-[#0a0a0c] text-white">
                  {roles.filter(r => !r.isAdmin || (r as any).roleKey !== 'super_admin').map(r => (
                    <SelectItem key={r.id} value={r.id} className="rounded-none hover:bg-white/5">
                      {r.name} {r.isAdmin && '(Admin)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <CommandButton variant="ghost" size="sm" onClick={() => setShowAssignDialog(false)}>Cancel</CommandButton>
              <CommandButton
                size="sm"
                onClick={handleAssignRole}
                disabled={!selectedRole || actionLoading}
              >
                Assign Role
              </CommandButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revoke Role Dialog */}
        <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
          <DialogContent className="rounded-none border-white/10 bg-[#0a0a0c] text-white">
            <DialogHeader>
              <DialogTitle>Revoke Role from {selectedAdmin?.email}</DialogTitle>
              <DialogDescription className="text-zinc-500">
                Select a role to revoke from this admin user.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Role</p>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="rounded-none border-white/10 bg-black/60 text-white focus:ring-rose-500/20">
                  <SelectValue placeholder="Select role to revoke" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-none border-white/10 bg-[#0a0a0c] text-white">
                  {selectedAdmin?.assigned_roles.map((role, idx) => {
                    const roleKey = role.role_name.toLowerCase().replace(/\s+/g, '_');
                    const roleData = roles.find(r => (r as any).roleKey === roleKey || r.name.toLowerCase().replace(/\s+/g, '_') === roleKey);
                    return (
                      <SelectItem key={idx} value={roleData?.id || role.role_name} className="rounded-none hover:bg-white/5">
                        {role.role_name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <CommandButton variant="ghost" size="sm" onClick={() => setShowRevokeDialog(false)}>Cancel</CommandButton>
              <CommandButton
                size="sm"
                variant="danger"
                onClick={handleRevokeRole}
                disabled={!selectedRole || actionLoading}
              >
                Revoke Role
              </CommandButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPage>
  );
};

export default AdminRoleManagement;
