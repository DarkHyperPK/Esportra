import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Shield,
  UserPlus,
  UserMinus,
  Crown,
  Users,
  Mail,
  Calendar,
  Eye,
  X,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { ROLE_PERMISSIONS } from '@/hooks/useAdminPermissions';

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
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Check if current user is super admin
  const isSuperAdmin = admin.roles.includes('super_admin');

  useEffect(() => {
    if (!isSuperAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only Super Admins can access this page.',
        variant: 'destructive'
      });
      return;
    }
    loadRoles();
    loadAdmins();
  }, [isSuperAdmin]);

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
        ...regularRoles.map(role => ({
          ...role,
          isAdmin: false
        }))
      ];
      
      setRoles(allRoles);
    } catch (err) {
      console.error('Error loading roles:', err);
    }
  };

  const loadAdmins = async () => {
    try {
      setLoading(true);
      
      // Get all admin users
      const { data: adminProfiles, error } = await supabase
        .from('profiles')
        .select('id, email, username, full_name, is_admin, admin_roles, created_at')
        .eq('is_admin', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get role assignments for each admin
      const adminsWithRoles = await Promise.all(
        (adminProfiles || []).map(async (admin) => {
          const { data: userRoles } = await supabase
            .from('admin_user_roles')
            .select(`
              role_id,
              assigned_at,
              assigned_by,
              admin_roles:role_id(name)
            `)
            .eq('user_id', admin.id);
          
          const assignedRoles = (userRoles || []).map((ur: any) => ({
            role_id: ur.role_id,
            role_name: ur.admin_roles?.name || 'Unknown',
            assigned_at: ur.assigned_at,
            assigned_by: ur.assigned_by
          }));
          
          return {
            ...admin,
            assigned_roles: assignedRoles
          };
        })
      );
      
      setAdmins(adminsWithRoles);
    } catch (err: any) {
      console.error('Error loading admins:', err);
      toast({
        title: 'Error',
        description: 'Failed to load admins',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedAdmin || !selectedRole) return;
    
    try {
      setActionLoading(true);
      const user = { id: selectedAdmin.id, email: selectedAdmin.email, is_admin: selectedAdmin.is_admin, admin_roles: selectedAdmin.admin_roles };
      const targetUserIsSuperAdmin = user.is_admin && (user.admin_roles as string[])?.includes('super_admin');
      const selectedRoleData = roles.find(r => r.id === selectedRole);
      const roleDisplayName = selectedRoleData?.name || selectedRole.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const isAdminRole = selectedRoleData?.isAdmin || false;
      
      if (targetUserIsSuperAdmin) {
        toast({ title: 'Cannot Assign Role', description: 'Super admins cannot have roles assigned.', variant: 'destructive' });
        setActionLoading(false);
        return;
      }
      
      if (selectedRole === 'super_admin' || selectedRoleData?.roleKey === 'super_admin') {
        toast({ title: 'Cannot Assign Role', description: 'Super admin role cannot be assigned through this interface.', variant: 'destructive' });
        setActionLoading(false);
        return;
      }
      
      if (isAdminRole) {
        const roleData = selectedRoleData as (Role & { roleKey?: string; roleId?: string | number });
        let roleId: string | number;
        let roleKey: string;
        
        if (roleData?.roleId) {
          roleId = roleData.roleId;
          const rawKey = roleData.roleKey || roleData.name || selectedRole;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
        } else {
          const { data: adminRoleRecord, error: roleLookupError } = await supabase
            .from('admin_roles')
            .select('id, key, name')
            .or(`id.eq.${selectedRole},key.eq.${selectedRole},name.eq.${selectedRole}`)
            .maybeSingle();
          
          if (roleLookupError || !adminRoleRecord) {
            throw new Error(`Admin role '${selectedRole}' not found`);
          }
          
          const rawKey = adminRoleRecord.key || adminRoleRecord.name || selectedRole;
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
          setActionLoading(false);
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
            setActionLoading(false);
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
            role: selectedRole,
            is_active: true,
            assigned_by: profile?.id,
            assigned_at: new Date().toISOString()
          });
        
        if (userRoleError) {
          const { error: updateError } = await supabase
            .from('user_roles')
            .update({ is_active: true, assigned_by: profile?.id, assigned_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('role', selectedRole);
          if (updateError) throw updateError;
        }
      }
      
      toast({ title: 'Role Assigned', description: `${roleDisplayName} assigned to ${user.email}` });
      window.dispatchEvent(new CustomEvent('adminRolesUpdated'));
      localStorage.setItem('admin_roles_updated', Date.now().toString());
      
      setShowAssignDialog(false);
      setSelectedRole('');
      loadAdmins();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to assign role', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeRole = async () => {
    if (!selectedAdmin || !selectedRole) return;
    
    try {
      setActionLoading(true);
      const user = { id: selectedAdmin.id, email: selectedAdmin.email, is_admin: selectedAdmin.is_admin, admin_roles: selectedAdmin.admin_roles };
      const targetUserIsSuperAdmin = user.is_admin && (user.admin_roles as string[])?.includes('super_admin');
      
      if (targetUserIsSuperAdmin) {
        toast({ title: 'Cannot Revoke Role', description: 'Super admins do not have roles assigned.', variant: 'destructive' });
        setActionLoading(false);
        return;
      }
      
      const selectedRoleData = roles.find(r => r.id === selectedRole);
      const roleDisplayName = selectedRoleData?.name || selectedRole.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const isAdminRole = selectedRoleData?.isAdmin || false;
      
      if (selectedRole === 'super_admin' || selectedRoleData?.roleKey === 'super_admin') {
        toast({ title: 'Cannot Revoke Role', description: 'Super admin role cannot be revoked.', variant: 'destructive' });
        setActionLoading(false);
        return;
      }
      
      if (isAdminRole) {
        const roleData = selectedRoleData as (Role & { roleKey?: string; roleId?: string | number });
        let roleId: string | number;
        let roleKey: string;
        
        if (roleData?.roleId) {
          roleId = roleData.roleId;
          const rawKey = roleData.roleKey || roleData.name || selectedRole;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
        } else {
          const { data: adminRoleRecord, error: roleLookupError } = await supabase
            .from('admin_roles')
            .select('id, key, name')
            .or(`id.eq.${selectedRole},key.eq.${selectedRole},name.eq.${selectedRole}`)
            .maybeSingle();
          
          if (roleLookupError || !adminRoleRecord) {
            throw new Error(`Admin role '${selectedRole}' not found`);
          }
          
          const rawKey = adminRoleRecord.key || adminRoleRecord.name || selectedRole;
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
          setActionLoading(false);
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
          .eq('role', selectedRole)
          .eq('is_active', true)
          .maybeSingle();
        
        if (!existingUserRole) {
          toast({ title: 'Role Not Found', description: `${roleDisplayName} is not active for ${user.email}`, variant: 'destructive' });
          setActionLoading(false);
          return;
        }
        
        const { error: userRoleError } = await supabase
          .from('user_roles')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('role', selectedRole);
        
        if (userRoleError) throw userRoleError;
      }
      
      toast({ title: 'Role Revoked', description: `${roleDisplayName} revoked from ${user.email}` });
      window.dispatchEvent(new CustomEvent('adminRolesUpdated'));
      localStorage.setItem('admin_roles_updated', Date.now().toString());
      
      setShowRevokeDialog(false);
      setSelectedRole('');
      loadAdmins();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to revoke role', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
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

  if (!isSuperAdmin) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
          <p className="text-gray-400">Only Super Admins can access this page.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" />
            Admin Management
          </h2>
          <p className="text-gray-400 mt-1">Manage admin roles and permissions</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search admins by email, username, or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full md:w-48 bg-gray-700 border-gray-600 text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
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
        </CardContent>
      </Card>

      {/* Admins Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Admin Users ({filteredAdmins.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading admins...</div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No admins found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Admin</TableHead>
                    <TableHead className="text-gray-300">Roles</TableHead>
                    <TableHead className="text-gray-300">Permissions</TableHead>
                    <TableHead className="text-gray-300">Joined</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map((admin) => {
                    const isSuperAdminUser = admin.admin_roles?.includes('super_admin');
                    const displayRoles = admin.assigned_roles.length > 0 
                      ? admin.assigned_roles.map(r => r.role_name)
                      : (admin.admin_roles || []);
                    
                    return (
                      <TableRow key={admin.id} className="border-gray-700">
                        <TableCell>
                          <div>
                            <div className="font-medium text-white">{admin.full_name || admin.username}</div>
                            <div className="text-sm text-gray-400">{admin.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {isSuperAdminUser ? (
                              <Badge className="bg-yellow-600 text-white">
                                <Crown className="w-3 h-3 mr-1" />
                                Super Admin
                              </Badge>
                            ) : (
                              displayRoles.map((role, idx) => (
                                <Badge key={idx} className="bg-blue-600 text-white">
                                  {role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isSuperAdminUser ? (
                            <Badge variant="outline" className="border-yellow-400 text-yellow-400">
                              All Permissions
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">
                              {admin.assigned_roles.length} role(s)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {new Date(admin.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {!isSuperAdminUser && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                                onClick={() => {
                                  setSelectedAdmin(admin);
                                  setShowAssignDialog(true);
                                }}
                              >
                                <UserPlus className="w-3 h-3 mr-1" />
                                Assign
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-600 text-red-400 hover:bg-red-600/10"
                                onClick={() => {
                                  setSelectedAdmin(admin);
                                  setShowRevokeDialog(true);
                                }}
                              >
                                <UserMinus className="w-3 h-3 mr-1" />
                                Revoke
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Role Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Assign Role to {selectedAdmin?.email}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a role to assign to this admin user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {roles.filter(r => !r.isAdmin || (r as any).roleKey !== 'super_admin').map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} {r.isAdmin && '(Admin)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleAssignRole} 
              disabled={!selectedRole || actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Role Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Revoke Role from {selectedAdmin?.email}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a role to revoke from this admin user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select role to revoke" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {selectedAdmin?.assigned_roles.map((role, idx) => {
                  const roleKey = role.role_name.toLowerCase().replace(/\s+/g, '_');
                  const roleData = roles.find(r => (r as any).roleKey === roleKey || r.name.toLowerCase().replace(/\s+/g, '_') === roleKey);
                  return (
                    <SelectItem key={idx} value={roleData?.id || role.role_name}>
                      {role.role_name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleRevokeRole} 
              disabled={!selectedRole || actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              Revoke Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRoleManagement;

