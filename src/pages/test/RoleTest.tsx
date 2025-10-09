import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const RoleTest = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dbRole, setDbRole] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const checkDatabaseRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      setDbRole(data?.role || 'No role found');
      toast({
        title: "Database Role",
        description: `Your role in the database is: ${data?.role || 'No role found'}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const checkUserMetadata = async () => {
    if (!user) return;
    
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setMetadata(currentUser?.user_metadata);
      
      toast({
        title: "User Metadata",
        description: JSON.stringify(currentUser?.user_metadata, null, 2),
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fixRole = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // First check if we already have a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingRole) {
        // If role exists, use update instead of upsert
        const { error } = await supabase
          .from('user_roles')
          .update({ role: 'organizer' })
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // If no role exists, do a simple insert
        const { error } = await supabase
          .from('user_roles')
          .insert({ 
            user_id: user.id,
            role: 'organizer'
          });
        
        if (error) throw error;
      }
      
      // Clear any casual flags from metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          is_casual: false,
          role: 'organizer'
        }
      });

      if (metadataError) throw metadataError;
      
      toast({
        title: "Success",
        description: "Role has been set to organizer in both database and metadata",
      });
      
      // Refresh the role check
      await checkDatabaseRole();
      await checkUserMetadata();
      
      // Force a profile refresh
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Role Testing</CardTitle>
          <CardDescription>Test and fix role issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Current User Info:</h3>
              <pre className="bg-gray-100 p-2 rounded text-black">
                {JSON.stringify({
                  userId: user?.id,
                  email: user?.email,
                  currentRole: profile?.role,
                  databaseRole: dbRole,
                  metadata: metadata
                }, null, 2)}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={checkDatabaseRole}
                className="flex-1"
              >
                Check Database Role
              </Button>
              <Button 
                onClick={checkUserMetadata}
                className="flex-1"
              >
                Check User Metadata
              </Button>
              <Button 
                onClick={fixRole}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Fixing...' : 'Fix Role (Set to Organizer)'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleTest; 