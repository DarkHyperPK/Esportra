import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, UserPlus, UserMinus } from 'lucide-react';
import { ROLE_PERMISSIONS } from '@/hooks/useAdminPermissions';

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
        // Try to select with 'key' first, fallback to without 'key' if it doesn't exist
        let adminRoles: any[] = [];
        
        try {
          // First try with 'key' column (newer schema)
          const { data: rolesWithKey, error: errorWithKey } = await supabase
            .from('admin_roles')
            .select('id, key, name, description')
            .order('name');
          
          if (errorWithKey) {
            // Check if error is due to missing 'key' column
            const errorMessage = errorWithKey?.message || String(errorWithKey) || '';
            const errorCode = errorWithKey?.code || '';
            const isColumnError = errorMessage.includes('column') && errorMessage.includes('key') 
              || errorCode === '42703'; // PostgreSQL error code for undefined column
            
            if (isColumnError) {
              // If error is about missing 'key' column, try without it (older schema)
              console.warn('Key column not found, trying without key column:', errorWithKey);
              const { data: rolesWithoutKey, error: errorWithoutKey } = await supabase
                .from('admin_roles')
                .select('id, name, description')
                .order('name');
              
              if (errorWithoutKey) {
                console.error('Error loading admin roles (without key):', errorWithoutKey);
                // Continue with empty array - regular roles will still work
                adminRoles = [];
              } else {
                adminRoles = rolesWithoutKey || [];
              }
            } else {
              // Other error (permissions, table doesn't exist, etc.)
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
        
        // Regular user roles
        const regularRoles = [
          { id: 'organizer', name: 'organizer', description: 'Tournament Organizer - Can create and manage tournaments' },
          { id: 'venue_owner', name: 'venue_owner', description: 'Venue Owner - Can list and manage venues' },
          { id: 'casual', name: 'casual', description: 'Casual Player - Can join tournaments and create teams' }
        ];
        
        // Combine admin roles and regular roles
        const allRoles = [
          ...(adminRoles || []).map((role: any) => {
            // Determine the identifier to use (key, name, or id)
            const roleKey = role.key || role.name;
            const roleId = role.id;
            const roleIdentifier = role.key || role.id || role.name;
            
            return {
              id: roleIdentifier, // Use as the selectable ID
              name: role.name,
              description: role.description || '',
              isAdmin: true,
              roleKey: roleKey, // Store the key/name for profiles.admin_roles array
              roleId: roleId // Store the actual ID for admin_user_roles.role_id
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
      
      // Check if target user is a super admin
      const targetUserIsSuperAdmin = user.is_admin && (user.admin_roles as string[])?.includes('super_admin');
      
      const selectedRoleData = roles.find(r => r.id === selectedRole);
      const roleDisplayName =
        selectedRoleData?.name ||
        selectedRole.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const isAdminRole = selectedRoleData?.isAdmin || false;
      
      // HIERARCHICAL RESTRICTIONS:
      // 1. Block assigning ANY role (admin or regular) to super admins
      if (targetUserIsSuperAdmin) {
        toast({ 
          title: 'Cannot Assign Role', 
          description: 'Super admins cannot have roles assigned to them. They have all permissions by default and do not need additional roles.', 
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }
      
      // 2. Block assigning super_admin role (only system can create super admins)
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
        // Handle admin role assignment
        // Get the role data from the loaded roles (which has roleId stored)
        const roleData = selectedRoleData as (Role & { roleKey?: string; roleId?: string | number });
        
        // If we have roleId stored, use it; otherwise look it up
        let roleId: string | number;
        let roleKey: string;
        
        if (roleData?.roleId) {
          roleId = roleData.roleId;
          // Normalize role key: use key if available, otherwise convert name to lowercase with underscores
          const rawKey = roleData.roleKey || roleData.name || selectedRole;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
        } else {
          // Fallback: look up the role
          const { data: adminRoleRecord, error: roleLookupError } = await supabase
            .from('admin_roles')
            .select('id, key, name')
            .or(`id.eq.${selectedRole},key.eq.${selectedRole},name.eq.${selectedRole}`)
            .maybeSingle();
          
          if (roleLookupError || !adminRoleRecord) {
            throw new Error(`Admin role '${selectedRole}' not found in database`);
          }
          
          // Normalize role key: prefer key field, fallback to normalized name
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
        
        // Check if role already exists (multiple schema fallbacks)
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
        
        // Check if role key already in admin_roles array
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
        
        // Insert into admin_user_roles table
        const { error: adminError } = await supabase
          .from('admin_user_roles')
          .insert({
            user_id: user.id,
            role_id: roleId,
            assigned_by: profile?.id,
            assigned_at: new Date().toISOString()
          });
        
        if (adminError) {
          // If role already exists (shouldn't happen due to check above, but handle gracefully)
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
        
        // Update profiles.admin_roles array to include the role key
        const updatedAdminRoles = [...currentAdminRoles, roleKey];
        
        // Update profile with is_admin and admin_roles
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
        
        // Verify the role was actually stored - wait a bit for DB to sync
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
          
          // Also verify admin_user_roles table
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
        
        // Get role display name for toast message
        toast({ title: 'Role Assigned', description: `${roleDisplayName} assigned to ${email}` });
        
        // Trigger refresh events for the assigned user (if they're logged in)
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
        // Handle regular user role assignment using multi-role system
        // First, add the role to user_roles table
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
          // If role already exists, just update it to active
          const { error: updateError } = await supabase
            .from('user_roles')
            .update({ is_active: true, assigned_by: profile?.id, assigned_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('role', selectedRole);
          
          if (updateError) throw updateError;
        }

        // Create verification record for organizer/venue_owner roles
        if (selectedRole === 'organizer' || selectedRole === 'venue_owner') {
          try {
            // Create verification request record with approved status
            // @ts-ignore - verification_requests table may not be in types
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
              // Don't throw error, just log it
            }

            // Also add to verified_roles table
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

        // Update the user's base role if this is their first role assignment
        const { data: existingRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (existingRoles && existingRoles.length === 1) {
          // This is their first role, set it as base role
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
      
      // Trigger admin context refresh for the assigned user
      // Dispatch event to refresh admin context in all tabs
      window.dispatchEvent(new CustomEvent('adminRolesUpdated'));
      
      // Also trigger via localStorage for cross-tab updates
      window.localStorage.setItem('admin_roles_updated', Date.now().toString());
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'admin_roles_updated',
        newValue: Date.now().toString()
      }));
      
      // If assigning to current user, also refresh immediately
      if (user.id === profile?.id) {
        // Small delay to ensure database update is complete
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        // For other users, show message that they need to refresh
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
      
      // Check if target user is a super admin
      const targetUserIsSuperAdmin = user.is_admin && (user.admin_roles as string[])?.includes('super_admin');
      
      // HIERARCHICAL RESTRICTIONS:
      // Block revoking roles from super admins (they don't have roles assigned)
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
      
      // Block revoking super_admin role (only system can manage it)
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
        // Handle admin role revocation
        // Get the role data from the loaded roles (which has roleId stored)
        const roleData = selectedRoleData as (Role & { roleKey?: string; roleId?: string | number });
        
        // If we have roleId stored, use it; otherwise look it up
        let roleId: string | number;
        let roleKey: string;
        
        if (roleData?.roleId) {
          roleId = roleData.roleId;
          // Normalize role key: use key if available, otherwise convert name to lowercase with underscores
          const rawKey = roleData.roleKey || roleData.name || selectedRole;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
        } else {
          // Fallback: look up the role
          const { data: adminRoleRecord, error: roleLookupError } = await supabase
            .from('admin_roles')
            .select('id, key, name')
            .or(`id.eq.${selectedRole},key.eq.${selectedRole},name.eq.${selectedRole}`)
            .maybeSingle();
          
          if (roleLookupError || !adminRoleRecord) {
            throw new Error(`Admin role '${selectedRole}' not found in database`);
          }
          
          // Normalize role key: prefer key field, fallback to normalized name
          const rawKey = adminRoleRecord.key || adminRoleRecord.name || selectedRole;
          roleKey = rawKey.toLowerCase().replace(/\s+/g, '_');
          roleId = adminRoleRecord.id;
        }
        
        // Check if the user actually has this admin role
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

        // Delete from admin_user_roles table
        const { error: adminError } = await supabase
          .from('admin_user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('role_id', roleId);
        
        if (adminError) throw adminError;
        
        // Update profiles.admin_roles array to remove the role key
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('admin_roles')
          .eq('id', user.id)
          .maybeSingle();
        
        const currentAdminRoles = (currentProfile?.admin_roles as string[]) || [];
        const updatedAdminRoles = currentAdminRoles.filter(r => r !== roleKey);
        
        // Check if user has any other admin roles
        const { data: remainingAdminRoles } = await supabase
          .from('admin_user_roles')
          .select('id')
          .eq('user_id', user.id);
        
        // Update profile - set is_admin to false if no roles left
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            is_admin: remainingAdminRoles && remainingAdminRoles.length > 0,
            admin_roles: updatedAdminRoles
          })
          .eq('id', user.id);
        
        if (profileError) throw profileError;
        
      } else {
        // Handle regular user role revocation using multi-role system
        // Check if role exists and is active
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

        // Deactivate the role in user_roles table
        const { error: userRoleError } = await supabase
          .from('user_roles')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('role', selectedRole);
        
        if (userRoleError) throw userRoleError;

        // Also mark verification as revoked (not deleted) to keep history
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

        // Check if user has any remaining active roles
        const { data: remainingRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        // If no roles left, set base_role to casual
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
    } catch (e: any) {
      console.error('Error revoking role:', e);
      toast({ title: 'Error', description: e.message || 'Failed to revoke role', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400"/> Admin Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input placeholder="User email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-gray-700 border-gray-600 text-white" />
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-[300px]">
                {/* Regular User Roles */}
                {roles.filter(r => !r.isAdmin).length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">User Roles</div>
                    {roles.filter(r => !r.isAdmin).map(r => (
                      <SelectItem key={r.id} value={r.id} className="flex items-center gap-2">
                        <span className="capitalize">{r.name}</span>
                      </SelectItem>
                    ))}
                  </>
                )}
                {/* Admin Roles (excluding super_admin) */}
                {roles.filter(r => r.isAdmin && (r as any).roleKey !== 'super_admin').length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase mt-2 border-t border-gray-700 pt-2">Admin Roles</div>
                    {roles.filter(r => r.isAdmin && (r as any).roleKey !== 'super_admin').map(r => (
                      <SelectItem key={r.id} value={r.id} className="flex items-center gap-2">
                        <span className="capitalize">{r.name}</span>
                        <Badge variant="secondary" className="text-xs ml-auto">Admin</Badge>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button disabled={loading} onClick={assign} className="bg-blue-600 hover:bg-blue-700 text-white">
                <UserPlus className="w-4 h-4 mr-2"/> Assign
              </Button>
              <Button disabled={loading} onClick={revoke} variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/10">
                <UserMinus className="w-4 h-4 mr-2"/> Revoke
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-400 space-y-2">
            <div>
              <strong className="text-gray-300">Role Hierarchy:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1 ml-2">
                <li><strong className="text-yellow-400">Super Admin</strong> - Cannot have roles assigned. Has all permissions by default.</li>
                <li><strong className="text-blue-400">Admin Roles</strong> - Can be assigned to regular users (not super admins).</li>
                <li><strong className="text-green-400">User Roles</strong> - Regular user roles (organizer, venue_owner, casual).</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-gray-700">
              <strong className="text-gray-300">Available Roles:</strong>
              <div className="flex flex-wrap gap-2 mt-1">
                {roles.filter(r => !r.isAdmin || (r as any).roleKey !== 'super_admin').map(r => (
                  <Badge key={r.id} className={`${r.isAdmin ? 'bg-blue-600' : 'bg-gray-700'} text-white`}>
                    {r.name} {r.isAdmin && '(Admin)'}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAccess;


