import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Building2, Gamepad2, Shield, CheckCircle, XCircle } from 'lucide-react';

interface UserRole {
  role: string;
  is_active: boolean;
  assigned_at: string;
  assigned_by?: string;
}

interface VerifiedRole {
  role: string;
  status: string;
  verified_at: string;
  verified_by?: string;
}

const UserRolesDisplay: React.FC = () => {
  const { user, profile } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [verifiedRoles, setVerifiedRoles] = useState<VerifiedRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!user) return;

      try {
        // Fetch user's roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role, is_active, assigned_at, assigned_by')
          .eq('user_id', user.id)
          .order('assigned_at', { ascending: false });

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
        } else {
          setUserRoles(roles || []);
        }

        // Fetch verified roles
        const { data: verified, error: verifiedError } = await supabase
          .from('verified_roles')
          .select('role, status, verified_at, verified_by')
          .eq('user_id', user.id)
          .order('verified_at', { ascending: false });

        if (verifiedError) {
          console.error('Error fetching verified roles:', verifiedError);
        } else {
          setVerifiedRoles(verified || []);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRoles();
  }, [user]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'organizer': return <Trophy className="w-4 h-4" />;
      case 'venue_owner': return <Building2 className="w-4 h-4" />;
      case 'casual': return <Gamepad2 className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      default: return <Gamepad2 className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'organizer': return 'bg-purple-600';
      case 'venue_owner': return 'bg-green-600';
      case 'casual': return 'bg-blue-600';
      case 'admin': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'organizer': return 'Organizer';
      case 'venue_owner': return 'Venue Owner';
      case 'casual': return 'Player';
      case 'admin': return 'Admin';
      default: return role;
    }
  };

  const isRoleVerified = (role: string) => {
    // Check if role is verified in the verified_roles table
    const isVerifiedInTable = verifiedRoles.some(vr => vr.role === role && vr.status === 'approved');
    
    // Also check if user is admin (admins are verified for all roles)
    const isAdmin = profile?.is_admin;
    
    return isVerifiedInTable || isAdmin;
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="text-gray-400">Loading roles...</div>
        </CardContent>
      </Card>
    );
  }

  const activeRoles = userRoles.filter(role => role.is_active);
  const isAdmin = profile?.is_admin;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Your Roles & Permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-300">
              <Shield className="w-4 h-4" />
              <span className="font-medium">Admin Access</span>
            </div>
            <p className="text-sm text-red-200 mt-1">
              You have full administrative privileges and can access all features.
            </p>
          </div>
        )}

        {activeRoles.length === 0 && !isAdmin ? (
          <div className="text-center py-4">
            <div className="text-gray-400 mb-2">No special roles assigned</div>
            <div className="text-sm text-gray-500">
              You have basic player access. Contact an admin to request additional roles.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeRoles.map((userRole) => {
              const isVerified = isRoleVerified(userRole.role);
              return (
                <div
                  key={userRole.role}
                  className={`p-3 rounded-lg border ${
                    isVerified 
                      ? 'border-green-500 bg-green-500/10' 
                      : 'border-gray-600 bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRoleIcon(userRole.role)}
                      <div>
                        <div className="font-medium text-white">
                          {getRoleLabel(userRole.role)}
                        </div>
                        <div className="text-xs text-gray-400">
                          Assigned {new Date(userRole.assigned_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isVerified ? (
                        <Badge className="bg-green-600 text-white text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-xs">
                          <XCircle className="w-3 h-3 mr-1" />
                          Pending Verification
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <div className="font-medium mb-1">Role Benefits:</div>
          <ul className="space-y-1">
            <li>• <strong>Player:</strong> Create teams, join tournaments, compete</li>
            <li>• <strong>Organizer:</strong> Create tournaments, manage events, verify results</li>
            <li>• <strong>Venue Owner:</strong> List venues, host tournaments, manage spaces</li>
            <li>• <strong>Admin:</strong> Full system access and user management</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserRolesDisplay;
