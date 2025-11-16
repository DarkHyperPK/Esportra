import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Database, Monitor } from 'lucide-react';

const RoleDebugInfo: React.FC = () => {
  const { user, profile } = useAuth();
  const { currentRole, refreshRoleFromDatabase } = useRole();
  const [databaseRole, setDatabaseRole] = useState<string | null>(null);
  const [localStorageRole, setLocalStorageRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDatabaseRole = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching database role:', error);
        setDatabaseRole('Error: ' + error.message);
      } else {
        setDatabaseRole(data?.role || 'null');
      }
    } catch (error) {
      console.error('Error:', error);
      setDatabaseRole('Error: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAll = async () => {
    await refreshRoleFromDatabase();
    await fetchDatabaseRole();
    setLocalStorageRole(localStorage.getItem('sessionRole'));
  };

  useEffect(() => {
    fetchDatabaseRole();
    setLocalStorageRole(localStorage.getItem('sessionRole'));
  }, [user]);

  if (!user) return null;

  const isInSync = currentRole === databaseRole && currentRole === localStorageRole;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          Role Debug Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Context Role */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Context Role</h4>
            <Badge 
              variant={currentRole === databaseRole ? "default" : "destructive"}
              className="w-full justify-center"
            >
              {currentRole}
            </Badge>
          </div>

          {/* Database Role */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Database Role</h4>
            <Badge 
              variant={databaseRole === currentRole ? "default" : "destructive"}
              className="w-full justify-center"
            >
              {databaseRole || 'Loading...'}
            </Badge>
          </div>

          {/* LocalStorage Role */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">LocalStorage Role</h4>
            <Badge 
              variant={localStorageRole === currentRole ? "default" : "destructive"}
              className="w-full justify-center"
            >
              {localStorageRole || 'null'}
            </Badge>
          </div>
        </div>

        {/* Sync Status */}
        <div className="text-center">
          <Badge 
            variant={isInSync ? "default" : "destructive"}
            className="text-sm"
          >
            {isInSync ? '✅ All in sync' : '❌ Out of sync'}
          </Badge>
        </div>

        {/* Profile Info */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Profile Info</h4>
          <div className="text-xs text-gray-400 space-y-1">
            <div>User ID: {user.id}</div>
            <div>Profile Role: {profile?.role || 'null'}</div>
            <div>Is Admin: {profile?.is_admin ? 'Yes' : 'No'}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={refreshAll} 
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
          <Button 
            onClick={fetchDatabaseRole} 
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <Database className="w-4 h-4 mr-2" />
            Check DB
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoleDebugInfo;
