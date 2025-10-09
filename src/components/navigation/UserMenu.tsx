import { Link, useNavigate } from "react-router-dom";
import { User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import RoleSwitcher from "@/components/RoleSwitcher";
import IdentitySwitcher from "@/components/IdentitySwitcher";

const UserMenu = ({ 
  handleSignOut 
}: { 
  handleSignOut: () => Promise<void>; 
}) => {
  const { user, profile } = useAuth();
  const admin = useAdmin();
  const navigate = useNavigate();

  const userRole = profile?.role || 'casual';

  const [hasTeam, setHasTeam] = useState(false);

  const checkTeamStatus = async () => {
    if (!user) { setHasTeam(false); return; }
    try {
      const { data: created } = await supabase
        .from('teams')
        .select('id')
        .eq('created_by', user.id)
        .maybeSingle();
      if (created?.id) { setHasTeam(true); return; }
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();
      setHasTeam(!!membership?.team_id);
    } catch {
      setHasTeam(false);
    }
  };

  useEffect(() => {
    checkTeamStatus();
  }, [user?.id]);

  // Listen for team changes (when user creates/joins/leaves a team)
  useEffect(() => {
    const handleTeamChange = () => {
      checkTeamStatus();
    };

    // Listen for custom events that indicate team changes
    window.addEventListener('teamCreated', handleTeamChange);
    window.addEventListener('teamJoined', handleTeamChange);
    window.addEventListener('teamLeft', handleTeamChange);

    return () => {
      window.removeEventListener('teamCreated', handleTeamChange);
      window.removeEventListener('teamJoined', handleTeamChange);
      window.removeEventListener('teamLeft', handleTeamChange);
    };
  }, [user?.id]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="border-esports-accent text-esports-accent hover:bg-esports-accent hover:text-white">
          <User className="h-4 w-4 mr-2" />
          {profile?.username || 'Account'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-esports-dark border border-gray-600/30 shadow-lg backdrop-blur-md">
        <DropdownMenuLabel>
          {profile?.full_name || profile?.username || 'User'}
          <div className="text-xs text-muted-foreground mt-1">
            {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
                    {/* Role Switcher - Hide for admin users */}
                    {userRole !== 'admin' && (
                      <div className="px-2 py-2">
                        <RoleSwitcher />
                      </div>
                    )}
                    
                    {/* Identity Switcher - Hide for admin users */}
                    {userRole !== 'admin' && (
                      <div className="px-2 py-2">
                        <IdentitySwitcher />
                      </div>
                    )}
                    <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/user/dashboard" className="w-full">Dashboard</Link>
          </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/auth/profile" className="w-full">Profile</Link>
                      </DropdownMenuItem>
                      {/* Hide verification status for admin users */}
                      {userRole !== 'admin' && (
                        <DropdownMenuItem asChild>
                          <Link to="/verification" className="w-full">Verification Status</Link>
                        </DropdownMenuItem>
                      )}
          {hasTeam ? (
            <DropdownMenuItem asChild>
              <Link to="/player/teams" className="w-full">
                <Users className="mr-2 h-4 w-4" />
                My Team
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <Link to="/player/teams" className="w-full">Create Your Team</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {userRole === 'venue_owner' && (
            <DropdownMenuItem asChild>
              <Link to="/venues/list-venue" className="w-full">List New Venue</Link>
            </DropdownMenuItem>
          )}
          {userRole === 'organizer' && (
            <>
              <DropdownMenuItem asChild>
                <Link to="/organizer/tournaments" className="w-full">Manage Tournaments</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/tournaments/create" className="w-full">Create Tournament</Link>
              </DropdownMenuItem>
            </>
          )}
          {admin.isAdmin && (
            <>
              <DropdownMenuItem asChild>
                <Link to="/admin/dashboard" className="w-full">Admin Dashboard</Link>
              </DropdownMenuItem>
              {admin.hasPermission('admin:assign_roles') && (
                <DropdownMenuItem asChild>
                  <Link to="/admin/access" className="w-full">Admin Access</Link>
                </DropdownMenuItem>
              )}
              {admin.hasPermission('verification:review') && (
                <DropdownMenuItem asChild>
                  <Link to="/admin/verification" className="w-full">Verification Queue</Link>
                </DropdownMenuItem>
              )}
              {admin.hasPermission('dispute:resolve') && (
                <DropdownMenuItem asChild>
                  <Link to="/admin/disputes" className="w-full">Dispute Center</Link>
                </DropdownMenuItem>
              )}
              {admin.hasPermission('settings:update') && (
                <DropdownMenuItem asChild>
                  <Link to="/admin/settings" className="w-full">System Settings</Link>
                </DropdownMenuItem>
              )}
              {admin.hasPermission('audit:view') && (
                <DropdownMenuItem asChild>
                  <Link to="/admin/audit" className="w-full">Activity Logs</Link>
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
