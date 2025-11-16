import { Link, useNavigate } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useNotifications } from "@/components/NotificationContext";
import { UserRole } from "@/types/auth";

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
    <div className="md:hidden bg-gray-900/95 backdrop-blur-md border-t border-white/10">
      <div className="px-2 pt-2 pb-3 space-y-1">
        <Link to="/" className="block px-3 py-2 text-gray-100 hover:text-white transition-colors" onClick={onClose}>
          Home
        </Link>
        <Link to="/venues/search" className="block px-3 py-2 text-gray-100 hover:text-white transition-colors" onClick={onClose}>
          Venues
        </Link>
        <Link to="/tournaments/upcoming" className="block px-3 py-2 text-gray-100 hover:text-white transition-colors" onClick={onClose}>
          Tournaments
        </Link>
        <Link to="/about/company" className="block px-3 py-2 text-gray-100 hover:text-white transition-colors" onClick={onClose}>
          About
        </Link>
        <Link to="/app" className="block px-3 py-2 text-gray-100 hover:text-white transition-colors" onClick={onClose}>
          Download App
        </Link>
        
        {user && (
          <>
            <div className="border-t border-white/10 my-2"></div>
            <Link to="/user/dashboard" className="block px-3 py-2 text-gray-100 hover:text-white transition-colors" onClick={onClose}>
              My Dashboard
            </Link>
            <Link to="/notifications" className="block px-3 py-2 text-gray-100 hover:text-white transition-colors" onClick={onClose}>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </Link>
            <Link to="/player/teams" className="block px-3 py-2 text-gray-100 hover:text-white transition-colors" onClick={onClose}>
              Create Your Team
            </Link>
            <Link to="/auth/profile" className="block px-3 py-2 text-gray-100 hover:text-white transition-colors" onClick={onClose}>
              My Profile
            </Link>
            {profile?.role === 'admin' && (
              <Link to="/admin/dashboard" className="block px-3 py-2 text-gaming-purple hover:text-white transition-colors" onClick={onClose}>
                Admin Panel
              </Link>
            )}
            {userRole === 'venue_owner' && (
              <Link to="/venues/list-venue" className="block px-3 py-2 text-gaming-purple hover:text-white transition-colors" onClick={onClose}>
                My Venues
              </Link>
            )}
            {userRole === 'organizer' && (
              <>
                <Link to="/organizer/tournaments" className="block px-3 py-2 text-gaming-purple hover:text-white transition-colors" onClick={onClose}>
                  Manage Tournaments
                </Link>
                <Link to="/tournaments/create" className="block px-3 py-2 text-gaming-purple hover:text-white transition-colors" onClick={onClose}>
                  Create Tournament
                </Link>
              </>
            )}
            <div className="border-t border-white/10 my-2"></div>
            <button 
              className="block w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 transition-colors"
              onClick={() => { onClose(); handleSignOut(); }}
            >
              Sign Out
            </button>
          </>
        )}
        
        {!user && (
          <div className="border-t border-white/10 pt-2 mt-2 space-y-2">
            <Link to="/auth/signin" className="block px-3 py-2 text-gray-100 hover:text-white transition-colors" onClick={onClose}>
              Sign In
            </Link>
            <Link to="/auth/signup" className="block px-3 py-2 bg-gaming-purple text-white rounded-md hover:bg-gaming-purple/80 transition-colors" onClick={onClose}>
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileNav;
