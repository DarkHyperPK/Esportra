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

type Role = { id: string; name: string; description: string; isAdmin?: boolean };

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
        const { data: adminRoles, error: adminError } = await supabase
          .from('admin_roles')
          .select('*')
          .order('name');
        
        if (adminError) {
          console.warn('Could not load admin roles:', adminError);
        }
        
        // Regular user roles
        const regularRoles = [
          { id: 'organizer', name: 'organizer', description: 'Tournament Organizer - Can create and manage tournaments' },
          { id: 'venue_owner', name: 'venue_owner', description: 'Venue Owner - Can list and manage venues' },
          { id: 'casual', name: 'casual', description: 'Casual Player - Can join tournaments and create teams' }
        ];
        
        // Combine admin roles and regular roles
        const allRoles = [
          ...(adminRoles || []).map(role => ({
            id: role.id,
            name: role.name,
            description: role.description,
            isAdmin: true
          })),
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
      const { data: user } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
      if (!user?.id) throw new Error('User not found');
      
      const selectedRoleData = roles.find(r => r.id === selectedRole);
      const isAdminRole = selectedRoleData?.isAdmin || false;
      
      if (isAdminRole) {
        // Handle admin role assignment
        const { error: adminError } = await supabase
          .from('admin_user_roles')
          .insert({
            user_id: user.id,
            admin_role_id: selectedRole,
            assigned_by: profile?.id,
            assigned_at: new Date().toISOString()
          });
        
        if (adminError) throw adminError;
        
        // Also set is_admin to true in profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_admin: true })
          .eq('id', user.id);
        
        if (profileError) throw profileError;
        
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
      
      toast({ title: 'Role Assigned', description: `${selectedRole} assigned to ${email}` });
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
      const { data: user } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
      if (!user?.id) throw new Error('User not found');
      
      const selectedRoleData = roles.find(r => r.id === selectedRole);
      const isAdminRole = selectedRoleData?.isAdmin || false;
      
      if (isAdminRole) {
        // Handle admin role revocation
        const { error: adminError } = await supabase
          .from('admin_user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('admin_role_id', selectedRole);
        
        if (adminError) throw adminError;
        
        // Check if user has any other admin roles
        const { data: remainingAdminRoles } = await supabase
          .from('admin_user_roles')
          .select('id')
          .eq('user_id', user.id);
        
        // If no admin roles left, set is_admin to false
        if (!remainingAdminRoles || remainingAdminRoles.length === 0) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ is_admin: false })
            .eq('id', user.id);
          
          if (profileError) throw profileError;
        }
        
      } else {
        // Handle regular user role revocation using multi-role system
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
      
      toast({ title: 'Role Revoked', description: `${selectedRole} revoked from ${email}` });
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
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id} className="flex items-center gap-2">
                    <span>{r.name}</span>
                    {r.isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                  </SelectItem>
                ))}
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

          <div className="text-sm text-gray-400">
            Roles available: {roles.map(r => (<Badge key={r.id} className="bg-gray-700 text-white mr-2">{r.name}</Badge>))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAccess;


