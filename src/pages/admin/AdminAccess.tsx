import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { auditLog } from '@/lib/auditLog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Shield, UserPlus, UserMinus, Crown, Users, ArrowLeft } from 'lucide-react';
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandPanel,
  CommandSection,
} from '@/components/management/CommandSurface';
import { Link } from 'react-router-dom';

type Role = {
  id: string;
  name: string;
  description: string;
  isAdmin?: boolean;
  roleKey?: string;
  roleId?: string | number;
};

const ADMIN_ACCESS_INPUT_CLASS =
  'w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20';

const AdminAccess: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('organizer');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        console.log('Loading roles...');

        let adminRoles: any[] = [];

        try {
          adminRoles = await apiClient.get<any[]>('/api/admin/roles');
        } catch (err: any) {
          console.error('Error loading admin roles:', err);
          adminRoles = [];
        }

        console.log('Loaded admin roles from API:', adminRoles);

        const regularRoles = [
          { id: 'organizer', name: 'organizer', description: 'Tournament Organizer - Can create and manage tournaments' },
          { id: 'venue_owner', name: 'venue_owner', description: 'Venue Owner - Can list and manage venues' },
          { id: 'casual', name: 'casual', description: 'Casual Player - Can join tournaments and create teams' }
        ];

        const allRoles = [
          ...(adminRoles || []).map((role: any) => {
            const roleKey = role.key || role.name;
            const roleId = role.id;
            const roleIdentifier = role.key || role.id || role.name;

            return {
              id: roleIdentifier,
              name: role.name,
              description: role.description || '',
              isAdmin: true,
              roleKey: roleKey,
              roleId: roleId
            };
          }),
          ...regularRoles.map(role => ({
            ...role,
            isAdmin: false
          }))
        ];

        console.log('Loaded roles:', allRoles);
        setRoles(allRoles);
      } catch (err) {
        console.error('Error loading roles:', err);
        toast({ title: 'Error', description: 'Failed to load roles', variant: 'destructive' });
      }
    };
    load();
  }, [toast]);

  const assign = async () => {
    try {
      setLoading(true);
      const searchResult = await apiClient.get<any>(`/api/profiles/search?q=${encodeURIComponent(email)}`);
      const user = Array.isArray(searchResult)
        ? (searchResult.find((p: any) => (p?.email ?? '').toLowerCase() === email.toLowerCase()) ?? searchResult[0])
        : searchResult;
      if (!user?.id) throw new Error('User not found');

      const targetUserIsSuperAdmin = user.is_admin && (user.admin_roles as string[])?.includes('super_admin');

      const selectedRoleData = roles.find(r => r.id === selectedRole);
      const roleDisplayName =
        selectedRoleData?.name ||
        selectedRole.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const isAdminRole = selectedRoleData?.isAdmin || false;

      if (targetUserIsSuperAdmin) {
        toast({
          title: 'Cannot Assign Role',
          description: 'Super admins cannot have roles assigned to them. They have all permissions by default and do not need additional roles.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      if (selectedRole === 'super_admin' || selectedRoleData?.roleKey === 'super_admin') {
        toast({
          title: 'Cannot Assign Role',
          description: 'Super admin role cannot be assigned through this interface. It must be assigned directly in the database.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      await apiClient.post(`/api/admin/users/${user.id}/action`, {
        action: 'assign_role',
        role: selectedRole,
        roleKey: selectedRoleData?.roleKey || selectedRole,
        roleType: isAdminRole ? 'admin' : 'user',
        assignedBy: profile?.id
      });

      toast({ title: 'Role Assigned', description: `${roleDisplayName} assigned to ${email}` });
      await auditLog.log('role_change', 'user', user.id, email, { action: 'assign', role: roleDisplayName });

      window.dispatchEvent(new CustomEvent('adminRolesUpdated'));

      window.localStorage.setItem('admin_roles_updated', Date.now().toString());
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'admin_roles_updated',
        newValue: Date.now().toString()
      }));

      if (user.id === profile?.id) {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast({
          title: 'Role Assigned',
          description: 'The user will need to refresh their browser to see the new role.',
          variant: 'default'
        });
      }
    } catch (e: any) {
      console.error('Error assigning role:', e);
      toast({ title: 'Error', description: e.message || 'Failed to assign role', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const revoke = async () => {
    try {
      setLoading(true);
      const searchResult = await apiClient.get<any>(`/api/profiles/search?q=${encodeURIComponent(email)}`);
      const user = Array.isArray(searchResult)
        ? (searchResult.find((p: any) => (p?.email ?? '').toLowerCase() === email.toLowerCase()) ?? searchResult[0])
        : searchResult;
      if (!user?.id) throw new Error('User not found');

      const targetUserIsSuperAdmin = user.is_admin && (user.admin_roles as string[])?.includes('super_admin');

      if (targetUserIsSuperAdmin) {
        toast({
          title: 'Cannot Revoke Role',
          description: 'Super admins do not have roles assigned. They have all permissions by default.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      const selectedRoleData = roles.find(r => r.id === selectedRole);
      const roleDisplayName =
        selectedRoleData?.name ||
        selectedRole.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const isAdminRole = selectedRoleData?.isAdmin || false;

      if (selectedRole === 'super_admin' || selectedRoleData?.roleKey === 'super_admin') {
        toast({
          title: 'Cannot Revoke Role',
          description: 'Super admin role cannot be revoked through this interface.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      await apiClient.post(`/api/admin/users/${user.id}/action`, {
        action: 'revoke_role',
        role: selectedRole,
        roleKey: selectedRoleData?.roleKey || selectedRole,
        roleType: isAdminRole ? 'admin' : 'user'
      });

      toast({
        title: 'Role Revoked',
        description: `${roleDisplayName} revoked from ${email}`,
      });
      await auditLog.log('role_change', 'user', user.id, email, { action: 'revoke', role: roleDisplayName });
    } catch (e: any) {
      console.error('Error revoking role:', e);
      toast({ title: 'Error', description: e.message || 'Failed to revoke role', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminPage
      eyebrow="Security"
      title="Admin Access"
      description="Assign and revoke user & admin roles"
      actions={
        <CommandButton variant="ghost" size="sm" asChild>
          <Link to="/admin/dashboard">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </CommandButton>
      }
    >
      <div className="space-y-5">
        {/* Role Assignment Card */}
        <CommandSection>
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Assign or Revoke Role</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">User Email</label>
              <input
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={ADMIN_ACCESS_INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="rounded-none border-white/10 bg-black/60 text-white focus:ring-rose-500/20">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-none border-white/10 bg-[#0a0a0c] text-white">
                  {roles.filter(r => !r.isAdmin).length > 0 && (
                    <>
                      <div className="px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">User Roles</div>
                      {roles.filter(r => !r.isAdmin).map(r => (
                        <SelectItem key={r.id} value={r.id} className="rounded-none capitalize text-white hover:bg-white/5">
                          {r.name.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {roles.filter(r => r.isAdmin && (r as any).roleKey !== 'super_admin').length > 0 && (
                    <>
                      <div className="mt-2 border-t border-white/10 px-3 pb-1 pt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Admin Roles</div>
                      {roles.filter(r => r.isAdmin && (r as any).roleKey !== 'super_admin').map(r => (
                        <SelectItem key={r.id} value={r.id} className="rounded-none hover:bg-white/5">
                          <div className="flex items-center gap-2">
                            <span className="capitalize">{r.name.replace(/_/g, ' ')}</span>
                            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-rose-400">admin</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Action</label>
              <div className="flex gap-2">
                <CommandButton
                  disabled={loading || !email}
                  onClick={assign}
                  className="flex-1"
                >
                  <UserPlus className="h-4 w-4" /> Assign
                </CommandButton>
                <CommandButton
                  disabled={loading || !email}
                  onClick={revoke}
                  variant="danger"
                  className="flex-1"
                >
                  <UserMinus className="h-4 w-4" /> Revoke
                </CommandButton>
              </div>
            </div>
          </div>
        </CommandSection>

        {/* Role Hierarchy Info */}
        <CommandSection>
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Role Hierarchy</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Super Admin */}
            <CommandPanel>
              <div className="mb-2 flex items-center gap-2">
                <Crown className="h-4 w-4 text-rose-400" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-rose-400">Super Admin</span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500">
                Cannot have roles assigned. Has all permissions by default.
              </p>
            </CommandPanel>
            {/* Admin Roles */}
            <CommandPanel>
              <div className="mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-rose-300" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-rose-300">Admin Roles</span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500">
                Can be assigned to regular users. Grants admin panel access.
              </p>
            </CommandPanel>
            {/* User Roles */}
            <CommandPanel>
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-300" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-200">User Roles</span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500">
                Regular user roles: organizer, venue owner, casual player.
              </p>
            </CommandPanel>
          </div>
        </CommandSection>

        {/* Available Roles */}
        <CommandSection>
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Available Roles</p>
          <div className="flex flex-wrap gap-2">
            {roles.filter(r => !r.isAdmin || (r as any).roleKey !== 'super_admin').map(r => (
              <span
                key={r.id}
                className={`border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  r.isAdmin
                    ? 'border-rose-500/30 text-rose-400'
                    : 'border-white/15 text-zinc-300'
                }`}
              >
                {r.name.replace(/_/g, ' ')}
                {r.isAdmin && (
                  <span className="ml-1.5 opacity-60">admin</span>
                )}
              </span>
            ))}
          </div>
        </CommandSection>
      </div>
    </AdminPage>
  );
};

export default AdminAccess;
