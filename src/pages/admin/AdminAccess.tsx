import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { auditLog } from '@/lib/auditLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, UserPlus, UserMinus, Crown, Users, ChevronRight, ArrowLeft } from 'lucide-react';
import { ROLE_PERMISSIONS } from '@/hooks/useAdminPermissions';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

type Role = {
  id: string;
  name: string;
  description: string;
  isAdmin?: boolean;
  roleKey?: string;
  roleId?: string | number;
};

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

        // Load admin roles from database
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
              console.warn('Key column not found, trying without key column:', errorWithKey);
              const { data: rolesWithoutKey, error: errorWithoutKey } = await supabase
                .from('admin_roles')
                .select('id, name, description')
                .order('name');

              if (errorWithoutKey) {
                console.error('Error loading admin roles (without key):', errorWithoutKey);
                adminRoles = [];
              } else {
                adminRoles = rolesWithoutKey || [];
              }
            } else {
              console.error('Error loading admin roles:', {
                message: errorWithKey?.message,
                code: errorWithKey?.code,
                details: errorWithKey?.details,
                hint: errorWithKey?.hint,
                fullError: errorWithKey
              });
              adminRoles = [];
            }
          } else {
            adminRoles = rolesWithKey || [];
          }
        } catch (err: any) {
          console.error('Exception loading admin roles:', err);
          adminRoles = [];
        }

        console.log('Loaded admin roles from DB:', adminRoles);

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
      const { data: user } = await supabase.from('profiles').select('id, email, is_admin, admin_roles').eq('email', email).maybeSingle();
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
            throw new Error(`Admin role '${selectedRole}' not found in database`);
          }

          const rawKey = adminRoleRecord.key || adminRoleRecord.name || selectedRole;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
          roleId = adminRoleRecord.id;
        }

        console.log('Role assignment details:', {
          selectedRole,
          roleKey,
          roleId,
          expectedPermissions: ROLE_PERMISSIONS[roleKey] || [],
          availableRoleKeys: Object.keys(ROLE_PERMISSIONS)
        });

        const { data: existingRoleExact } = await supabase
          .from('admin_user_roles')
          .select('role_id')
          .eq('user_id', user.id)
          .eq('role_id', roleId)
          .maybeSingle();

        let roleAlreadyAssigned = !!existingRoleExact;

        if (!roleAlreadyAssigned) {
          const { data: existingRoleByName } = await supabase
            .from('admin_user_roles')
            .select('role_id, admin_roles:role_id(name)')
            .eq('user_id', user.id);

          const hasMatchingName =
            existingRoleByName?.some(record => {
              const roleName = record.admin_roles?.name || '';
              return roleName.toLowerCase().replace(/\s+/g, '_') === roleKey;
            }) || false;

          if (hasMatchingName) roleAlreadyAssigned = true;
        }

        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('admin_roles')
          .eq('id', user.id)
          .maybeSingle();

        const currentAdminRoles = (currentProfile?.admin_roles as string[]) || [];
        if (currentAdminRoles.includes(roleKey)) {
          roleAlreadyAssigned = true;
        }
        if (roleAlreadyAssigned) {
          toast({
            title: 'Role Already Assigned',
            description: `${roleDisplayName} is already assigned to ${email}`,
            variant: 'default'
          });
          setLoading(false);
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
            toast({
              title: 'Role Already Assigned',
              description: `${roleDisplayName} is already assigned to ${email}`,
              variant: 'default'
            });
            setLoading(false);
            return;
          }
          throw adminError;
        }

        const updatedAdminRoles = [...currentAdminRoles, roleKey];

        const { error: profileError, data: profileUpdateData } = await supabase
          .from('profiles')
          .update({
            is_admin: true,
            admin_roles: updatedAdminRoles
          })
          .eq('id', user.id)
          .select('id, is_admin, admin_roles');

        if (profileError) {
          console.error('❌ Profile update failed:', {
            error: profileError,
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            userId: user.id,
            email,
            roleKey,
            updatedAdminRoles,
            currentUserIsAdmin: profile?.is_admin,
            currentUserAdminRoles: (profile as any)?.admin_roles
          });
          throw profileError;
        }

        console.log('✅ Profile update succeeded:', {
          userId: user.id,
          email,
          roleKey,
          updatedData: profileUpdateData,
          updatedAdminRoles
        });

        await new Promise(resolve => setTimeout(resolve, 200));

        const { data: verifyProfile, error: verifyError } = await supabase
          .from('profiles')
          .select('is_admin, admin_roles, admin_permissions')
          .eq('id', user.id)
          .maybeSingle();

        if (verifyError) {
          console.error('❌ Error verifying role assignment:', verifyError);
        } else {
          const storedRoles = (verifyProfile?.admin_roles as string[]) || [];
          const roleInArray = storedRoles.includes(roleKey);

          console.log('✅ Role assignment verification:', {
            userId: user.id,
            email,
            roleKey,
            roleId,
            roleDisplayName: selectedRoleData?.name || roleKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            storedAdminRoles: storedRoles,
            isAdmin: verifyProfile?.is_admin,
            roleInArray,
            adminUserRolesCheck: 'Will check below'
          });

          const { data: adminUserRoles, error: aurError } = await supabase
            .from('admin_user_roles')
            .select('role_id')
            .eq('user_id', user.id)
            .eq('role_id', roleId);

          if (aurError) {
            console.error('❌ Error checking admin_user_roles:', aurError);
          } else {
            console.log('✅ admin_user_roles check:', {
              found: adminUserRoles?.length || 0,
              records: adminUserRoles,
              expectedRoleId: roleId
            });
          }

          if (!roleInArray || !verifyProfile?.is_admin) {
            console.error('❌ ROLE NOT PROPERLY SAVED!', {
              expectedRoleKey: roleKey,
              storedRoles,
              isAdmin: verifyProfile?.is_admin,
              profileUpdateSuccess: 'Check above for profileError'
            });
            toast({
              title: 'Warning',
              description: 'Role assigned but verification failed. Please refresh the page.',
              variant: 'destructive'
            });
          }
        }

        toast({ title: 'Role Assigned', description: `${roleDisplayName} assigned to ${email}` });

        window.dispatchEvent(new CustomEvent('adminRolesUpdated'));
        localStorage.setItem('admin_roles_updated', Date.now().toString());

        console.log('📢 Role assignment complete - events dispatched:', {
          roleKey,
          roleDisplayName,
          email,
          userId: user.id,
          eventsDispatched: ['adminRolesUpdated', 'localStorage update']
        });

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

        if (selectedRole === 'organizer' || selectedRole === 'venue_owner') {
          try {
            // @ts-ignore
            const { error: verificationError } = await supabase
              .from('verification_requests')
              .insert({
                user_id: user.id,
                requested_role: selectedRole,
                status: 'approved',
                business_name: `Admin Assigned ${selectedRole}`,
                business_type: selectedRole === 'venue_owner' ? 'gaming_venue' : 'esports_organization',
                business_description: `Role assigned by admin - ${selectedRole}`,
                contact_email: email,
                submitted_at: new Date().toISOString(),
                reviewed_at: new Date().toISOString(),
                reviewed_by: profile?.id || 'admin'
              });

            if (verificationError) {
              console.warn('Could not create verification record:', verificationError);
            }

            const { error: verifiedRoleError } = await supabase
              .from('verified_roles')
              .insert({
                user_id: user.id,
                role: selectedRole,
                status: 'approved',
                verified_at: new Date().toISOString(),
                verified_by: profile?.id
              });

            if (verifiedRoleError) {
              console.warn('Could not create verified role record:', verifiedRoleError);
            }
          } catch (error) {
            console.warn('Verification tables may not exist:', error);
          }
        }

        const { data: existingRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (existingRoles && existingRoles.length === 1) {
          const { error: baseRoleError } = await supabase
            .from('profiles')
            .update({ base_role: selectedRole })
            .eq('id', user.id);

          if (baseRoleError) {
            console.warn('Could not update base role:', baseRoleError);
          }
        }
      }

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
      const { data: user } = await supabase.from('profiles').select('id, email, is_admin, admin_roles').eq('email', email).maybeSingle();
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
            throw new Error(`Admin role '${selectedRole}' not found in database`);
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
          toast({
            title: 'Role Not Found',
            description: `${roleDisplayName} is not assigned to ${email}`,
            variant: 'destructive',
          });
          setLoading(false);
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
          toast({
            title: 'Role Not Found',
            description: `${roleDisplayName} is not active for ${email}`,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const { error: userRoleError } = await supabase
          .from('user_roles')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('role', selectedRole);

        if (userRoleError) throw userRoleError;

        try {
          const { error: verifiedUpdateErr } = await supabase
            .from('verified_roles')
            .update({ status: 'rejected', is_active: false, updated_at: new Date().toISOString(), reviewed_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('role', selectedRole);
          if (verifiedUpdateErr) {
            console.warn('Could not update verified role to rejected:', verifiedUpdateErr);
          }
        } catch (e) {
          console.warn('verified_roles table may not exist or update failed:', e);
        }

        const { data: remainingRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (!remainingRoles || remainingRoles.length === 0) {
          const { error: baseRoleError } = await supabase
            .from('profiles')
            .update({ base_role: 'casual' })
            .eq('id', user.id);

          if (baseRoleError) {
            console.warn('Could not update base role:', baseRoleError);
          }
        }
      }

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
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <Link
          to="/admin/dashboard"
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <Shield className="w-5 h-5 text-rose-500" />
            </div>
            Admin Access Control
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Assign and revoke user & admin roles</p>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Role Assignment Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-zinc-800/50">
            <h2 className="text-lg font-semibold text-white">Assign or Revoke Role</h2>
            <p className="text-sm text-zinc-500 mt-1">Enter the user's email and select a role to assign or revoke.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">User Email</label>
                <Input
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-700/50 text-white placeholder:text-zinc-600 focus:border-rose-500/50 focus:ring-rose-500/20 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="bg-zinc-900/50 border-zinc-700/50 text-white rounded-xl">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0c] border-zinc-800 text-white max-h-[300px]">
                    {roles.filter(r => !r.isAdmin).length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">User Roles</div>
                        {roles.filter(r => !r.isAdmin).map(r => (
                          <SelectItem key={r.id} value={r.id} className="text-white hover:bg-white/5 rounded-lg capitalize">
                            {r.name.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {roles.filter(r => r.isAdmin && (r as any).roleKey !== 'super_admin').length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-2 border-t border-zinc-800 pt-3">Admin Roles</div>
                        {roles.filter(r => r.isAdmin && (r as any).roleKey !== 'super_admin').map(r => (
                          <SelectItem key={r.id} value={r.id} className="text-white hover:bg-white/5 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="capitalize">{r.name.replace(/_/g, ' ')}</span>
                              <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]">Admin</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Action</label>
                <div className="flex gap-2">
                  <Button
                    disabled={loading || !email}
                    onClick={assign}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/10 transition-all hover:-translate-y-0.5"
                  >
                    <UserPlus className="w-4 h-4 mr-2" /> Assign
                  </Button>
                  <Button
                    disabled={loading || !email}
                    onClick={revoke}
                    variant="outline"
                    className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl transition-all hover:-translate-y-0.5"
                  >
                    <UserMinus className="w-4 h-4 mr-2" /> Revoke
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Role Hierarchy Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-zinc-800/50">
            <h2 className="text-lg font-semibold text-white">Role Hierarchy</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Super Admin */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">Super Admin</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Cannot have roles assigned. Has all permissions by default.
                </p>
              </div>
              {/* Admin Roles */}
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-rose-400" />
                  <span className="text-sm font-semibold text-rose-400">Admin Roles</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Can be assigned to regular users. Grants admin panel access.
                </p>
              </div>
              {/* User Roles */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">User Roles</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Regular user roles: organizer, venue owner, casual player.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Available Roles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-zinc-800/50">
            <h2 className="text-lg font-semibold text-white">Available Roles</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {roles.filter(r => !r.isAdmin || (r as any).roleKey !== 'super_admin').map(r => (
                <Badge
                  key={r.id}
                  className={`${r.isAdmin
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    } px-3 py-1.5 text-xs font-medium rounded-lg capitalize`}
                >
                  {r.name.replace(/_/g, ' ')}
                  {r.isAdmin && (
                    <span className="ml-1.5 text-[10px] opacity-60">admin</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAccess;
