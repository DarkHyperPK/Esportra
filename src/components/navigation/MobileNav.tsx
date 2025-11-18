import { Link, useNavigate } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useNotifications } from "@/components/NotificationContext";
import { UserRole } from "@/types/auth";
import RoleSwitcher from "@/components/RoleSwitcher";
import IdentitySwitcher from "@/components/IdentitySwitcher";

const MobileNav = ({ 
  isOpen, 
  onClose,
  handleSignOut 
}: { 
  isOpen: boolean;
  onClose: () => void;
  handleSignOut: () => Promise<void>;
}) => {
  const { user, profile } = useAuth();
  const { currentRole } = useRole();
  const { unreadCount } = useNotifications();
  const userRole = currentRole as UserRole;

  if (!isOpen) return null;

  return (
    <div className="md:hidden bg-gradient-to-b from-gaming-dark via-gaming-dark/98 to-gaming-dark backdrop-blur-xl border-t border-gaming-purple/20 shadow-2xl">
      <div className="px-3 pt-4 pb-4 space-y-1">
        {/* General Navigation */}
        <div className="space-y-1 mb-3">
          <Link to="/" className="block px-4 py-3 text-gray-100 hover:text-white hover:bg-gaming-purple/20 rounded-lg transition-all duration-200 font-medium" onClick={onClose}>
            Home
          </Link>
          <Link to="/venues/search" className="block px-4 py-3 text-gray-100 hover:text-white hover:bg-gaming-purple/20 rounded-lg transition-all duration-200 font-medium" onClick={onClose}>
            Venues
          </Link>
          <Link to="/tournaments/upcoming" className="block px-4 py-3 text-gray-100 hover:text-white hover:bg-gaming-purple/20 rounded-lg transition-all duration-200 font-medium" onClick={onClose}>
            Tournaments
          </Link>
          <Link to="/about/company" className="block px-4 py-3 text-gray-100 hover:text-white hover:bg-gaming-purple/20 rounded-lg transition-all duration-200 font-medium" onClick={onClose}>
            About
          </Link>
          <Link to="/app" className="block px-4 py-3 text-gray-100 hover:text-white hover:bg-gaming-purple/20 rounded-lg transition-all duration-200 font-medium" onClick={onClose}>
            Download App
          </Link>
        </div>
        
        {user && (
          <>
            <div className="border-t border-gaming-purple/30 my-3"></div>
            
            {/* Role & Identity Switchers */}
            {userRole !== 'admin' && (
              <div className="space-y-2 mb-3 px-1">
                <div className="px-3 py-2 bg-gaming-gray/20 rounded-lg border border-gaming-gray/30">
                  <RoleSwitcher />
                </div>
                <div className="px-3 py-2 bg-gaming-gray/20 rounded-lg border border-gaming-gray/30">
                  <IdentitySwitcher />
                </div>
              </div>
            )}
            
            <div className="border-t border-gaming-purple/30 my-3"></div>
            
            {/* User Navigation */}
            <div className="space-y-1 mb-3">
              <Link to="/user/dashboard" className="block px-4 py-3 text-gray-100 hover:text-white hover:bg-gaming-purple/20 rounded-lg transition-all duration-200 font-medium" onClick={onClose}>
                My Dashboard
              </Link>
              <Link to="/notifications" className="block px-4 py-3 text-gray-100 hover:text-white hover:bg-gaming-purple/20 rounded-lg transition-all duration-200 font-medium" onClick={onClose}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </div>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              </Link>
              <Link to="/player/teams" className="block px-4 py-3 text-gray-100 hover:text-white hover:bg-gaming-purple/20 rounded-lg transition-all duration-200 font-medium" onClick={onClose}>
                Create Your Team
              </Link>
              <Link to="/auth/profile" className="block px-4 py-3 text-gray-100 hover:text-white hover:bg-gaming-purple/20 rounded-lg transition-all duration-200 font-medium" onClick={onClose}>
                My Profile
              </Link>
            </div>
            
            {/* Role-Specific Navigation */}
            {profile?.role === 'admin' && (
              <div className="space-y-1 mb-3">
                <Link to="/admin/dashboard" className="block px-4 py-3 text-gaming-purple hover:text-white hover:bg-gaming-purple/30 rounded-lg transition-all duration-200 font-semibold border border-gaming-purple/30" onClick={onClose}>
                  Admin Panel
                </Link>
              </div>
            )}
            {userRole === 'venue_owner' && (
              <div className="space-y-1 mb-3">
                <Link to="/venues/list-venue" className="block px-4 py-3 text-gaming-purple hover:text-white hover:bg-gaming-purple/30 rounded-lg transition-all duration-200 font-semibold border border-gaming-purple/30" onClick={onClose}>
                  My Venues
                </Link>
              </div>
            )}
            {userRole === 'organizer' && (
              <div className="space-y-1 mb-3">
                <Link to="/organizer/tournaments" className="block px-4 py-3 text-gaming-purple hover:text-white hover:bg-gaming-purple/30 rounded-lg transition-all duration-200 font-semibold border border-gaming-purple/30" onClick={onClose}>
                  Manage Tournaments
                </Link>
                <Link to="/tournaments/create" className="block px-4 py-3 text-gaming-purple hover:text-white hover:bg-gaming-purple/30 rounded-lg transition-all duration-200 font-semibold border border-gaming-purple/30" onClick={onClose}>
                  Create Tournament
                </Link>
              </div>
            )}
            
            <div className="border-t border-gaming-purple/30 my-3"></div>
            
            {/* Sign Out */}
            <button 
              className="block w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-all duration-200 font-semibold border border-red-500/30"
              onClick={() => { onClose(); handleSignOut(); }}
            >
              Sign Out
            </button>
          </>
        )}
        
        {!user && (
          <div className="border-t border-gaming-purple/30 pt-3 mt-3 space-y-2">
            <Link to="/auth/signin" className="block px-4 py-3 text-gray-100 hover:text-white hover:bg-gaming-purple/20 rounded-lg transition-all duration-200 font-medium text-center" onClick={onClose}>
              Sign In
            </Link>
            <Link to="/auth/signup" className="block px-4 py-3 bg-gradient-to-r from-gaming-purple to-purple-600 text-white rounded-lg hover:from-gaming-purple/90 hover:to-purple-600/90 transition-all duration-200 font-semibold text-center shadow-lg shadow-gaming-purple/30" onClick={onClose}>
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileNav;
