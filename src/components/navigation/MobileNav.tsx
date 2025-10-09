import { Link, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";

const MobileNav = ({ 
  mobileMenuOpen, 
  setMobileMenuOpen,
  handleSignOut 
}: { 
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  handleSignOut: () => Promise<void>;
}) => {
  const { user, profile } = useAuth();
  const userRole = (profile?.role || 'casual') as UserRole;

  return (
    <>
      <button 
        className="md:hidden text-white"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <Menu size={24} />
      </button>

      {mobileMenuOpen && (
        <div className="md:hidden fixed left-0 top-0 w-full h-screen bg-transparent backdrop-blur-md border-t border-white/10 z-50">
          <div className="container mx-auto py-8 flex flex-col space-y-6 font-roboto">
            <Link to="/" className="text-gray-100 hover:text-white text-lg font-semibold transition-colors" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link to="/venues/search" className="text-gray-100 hover:text-white text-lg font-semibold transition-colors" onClick={() => setMobileMenuOpen(false)}>Venues</Link>
            <Link to="/tournaments/upcoming" className="text-gray-100 hover:text-white text-lg font-semibold transition-colors" onClick={() => setMobileMenuOpen(false)}>Tournaments</Link>
            <Link to="/about/company" className="text-gray-100 hover:text-white text-lg font-semibold transition-colors" onClick={() => setMobileMenuOpen(false)}>About</Link>
            <Link to="/app" className="text-gray-100 hover:text-white text-lg font-semibold transition-colors" onClick={() => setMobileMenuOpen(false)}>Download App</Link>
            
            {user && (
              <>
                <Link to="/user/dashboard" className="text-gray-100 hover:text-white text-lg font-semibold transition-colors" onClick={() => setMobileMenuOpen(false)}>My Dashboard</Link>
                <Link to="/player/teams" className="text-gray-100 hover:text-white text-lg font-semibold transition-colors" onClick={() => setMobileMenuOpen(false)}>Create Your Team</Link>
                <Link to="/auth/profile" className="text-gray-100 hover:text-white text-lg font-semibold transition-colors" onClick={() => setMobileMenuOpen(false)}>My Profile</Link>
                {profile?.role === 'admin' && (
                  <Link to="/admin/dashboard" className="text-gaming-purple hover:text-white text-lg font-semibold transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    Admin Panel
                  </Link>
                )}
                {userRole === 'venue_owner' && (
                  <Link to="/venues/list-venue" className="text-gaming-purple hover:text-white text-lg font-semibold transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    My Venues
                  </Link>
                )}
                {userRole === 'organizer' && (
                  <>
                    <Link to="/organizer/tournaments" className="text-gaming-purple hover:text-white text-lg font-semibold transition-colors" onClick={() => setMobileMenuOpen(false)}>
                      Manage Tournaments
                    </Link>
                    <Link to="/tournaments/create" className="text-gaming-purple hover:text-white text-lg font-semibold transition-colors" onClick={() => setMobileMenuOpen(false)}>
                      Create Tournament
                    </Link>
                  </>
                )}
              </>
            )}
            
            {user ? (
              <Button 
                variant="outline" 
                className="border-gaming-purple text-gaming-purple hover:bg-gaming-purple hover:text-white"
                onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
              >
                Sign Out
              </Button>
            ) : (
              <div className="flex space-x-4 pt-2">
                <Button variant="outline" className="border-gaming-purple text-gaming-purple hover:bg-gaming-purple hover:text-white" asChild>
                  <Link to="/auth/signin" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
                </Button>
                <Button className="bg-gaming-purple hover:bg-gaming-purple/80 text-white" asChild>
                  <Link to="/auth/signup" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
