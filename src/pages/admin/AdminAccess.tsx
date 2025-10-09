import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserPlus, UserMinus } from 'lucide-react';

type Role = { id: number; key: string; name: string };

const AdminAccess: React.FC = () => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ops_admin');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('admin_roles').select('id, key, name');
      setRoles(data || []);
    };
    load();
  }, []);

  const assign = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
      if (!user?.id) throw new Error('User not found');
      const { error } = await supabase.rpc('admin_assign_role', { p_user: user.id, p_role_key: selectedRole });
      if (error) throw error;
      toast({ title: 'Role Assigned', description: `${selectedRole} assigned to ${email}` });
    } catch (e: any) {
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
      const { error } = await supabase.rpc('admin_revoke_role', { p_user: user.id, p_role_key: selectedRole });
      if (error) throw error;
      toast({ title: 'Role Revoked', description: `${selectedRole} revoked from ${email}` });
    } catch (e: any) {
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
                  <SelectItem key={r.id} value={r.key}>{r.name}</SelectItem>
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
            Roles available: {roles.map(r => (<Badge key={r.id} className="bg-gray-700 text-white mr-2">{r.key}</Badge>))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAccess;


